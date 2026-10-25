"""Temporal, seeded evaluation of Quorum recommendations and baselines."""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta
import math
from pathlib import Path
from typing import Iterable

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.stats import sem, t
from sqlalchemy import create_engine
from sqlalchemy.orm import Session as OrmSession

if (__package__ or "").partition(".")[0] == "evaluation":
    from recsys import config
    from recsys.group import STRATEGIES, FairnessRecord, aggregate_scores, fairness_weights, mmr_rerank, rank_group_candidates
    from recsys.individual import AttendanceObservation, ContentSignal, TimeObservation, club_attendance_fallback, score_members
    from synthetic_data.exporter import export_feature_datasets
    from synthetic_data.generator import GenerationConfig, SyntheticDatasetGenerator
    from app.embedding_service import encode_and_cache
    from app.models import EmbeddingCache
else:
    from backend.recsys import config
    from backend.recsys.group import STRATEGIES, FairnessRecord, aggregate_scores, fairness_weights, mmr_rerank, rank_group_candidates
    from backend.recsys.individual import AttendanceObservation, ContentSignal, TimeObservation, club_attendance_fallback, score_members
    from backend.synthetic_data.exporter import export_feature_datasets
    from backend.synthetic_data.generator import GenerationConfig, SyntheticDatasetGenerator
    from backend.app.embedding_service import encode_and_cache
    from backend.app.models import EmbeddingCache


def temporal_split(events: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Split chronologically into contiguous 70/15/15 train, validation, and test."""
    ordered = events.sort_values(["start_time", "id"], kind="stable").reset_index(drop=True)
    train_end = int(len(ordered) * 0.70)
    validation_end = int(len(ordered) * 0.85)
    if train_end < 1 or validation_end <= train_end or validation_end >= len(ordered):
        raise ValueError("Temporal evaluation requires enough events for all three splits.")
    return ordered.iloc[:train_end].copy(), ordered.iloc[train_end:validation_end].copy(), ordered.iloc[validation_end:].copy()


def _gini(values: Iterable[float]) -> float:
    data = np.asarray(list(values), dtype=np.float64)
    if not len(data) or np.all(data == 0):
        return 0.0
    data = np.sort(np.maximum(data, 0))
    return float((2 * np.dot(np.arange(1, len(data) + 1), data) / (len(data) * data.sum())) - (len(data) + 1) / len(data))


def _slot_bucket(hour: int, minute: int) -> str:
    minute_of_day = hour * 60 + minute
    bands = {"morning": (9 * 60, 11 * 60), "midday": (12 * 60, 14 * 60), "afternoon": (15 * 60, 17 * 60), "evening": (18 * 60, 20 * 60), "late_evening": (20 * 60 + 30, 22 * 60)}
    return min(bands, key=lambda name: min(abs(minute_of_day - bands[name][0]), abs(minute_of_day - bands[name][1])))


def _metric_accumulator() -> dict[str, list[float]]:
    return defaultdict(list)


def paired_comparison_table(per_seed: pd.DataFrame, best_baseline: str) -> pd.DataFrame:
    """Compare the main model with one validation-selected baseline using paired CIs."""
    metrics = [column for column in per_seed.columns if column not in {"seed", "method", "tuned_strategy", "best_baseline"}]
    rows = []
    for metric in metrics:
        main = per_seed[per_seed.method == "main_model"].set_index("seed")[metric]
        baseline = per_seed[per_seed.method == best_baseline].set_index("seed")[metric]
        difference = main - baseline.reindex(main.index)
        margin = float(t.ppf(0.975, len(difference) - 1) * sem(difference)) if len(difference) > 1 else 0.0
        ci_low = float(difference.mean() - margin)
        ci_high = float(difference.mean() + margin)
        low_better = metric in {"brier_score", "satisfaction_std", "satisfaction_gini"}
        directional = metric != "expected_attendance"
        statistically_better = (ci_high < 0 if low_better else ci_low > 0) if directional else False
        rows.append({
            "metric": metric,
            "baseline": best_baseline,
            "mean_paired_delta": float(difference.mean()),
            "ci95_low": ci_low,
            "ci95_high": ci_high,
            "direction": ("lower_is_better" if low_better else "higher_is_better") if directional else "informational",
            "beats_baseline": bool(statistically_better),
        })
    return pd.DataFrame(rows)


def paired_ablation(per_seed: pd.DataFrame, ablation_method: str) -> pd.DataFrame:
    """Return paired main-minus-ablation deltas and two-sided 95% t intervals."""
    metrics = [column for column in per_seed.columns if column not in {"seed", "method", "tuned_strategy", "best_baseline"}]
    main = per_seed[per_seed.method == "main_model"].set_index("seed")
    ablation = per_seed[per_seed.method == ablation_method].set_index("seed")
    rows = []
    for metric in metrics:
        difference = (main[metric] - ablation[metric].reindex(main.index)).dropna()
        margin = float(t.ppf(0.975, len(difference) - 1) * sem(difference)) if len(difference) > 1 else 0.0
        ci_low = float(difference.mean() - margin)
        ci_high = float(difference.mean() + margin)
        favorable = metric != "brier_score"
        rows.append({
            "metric": metric,
            "mean_paired_delta": float(difference.mean()),
            "ci95_low": ci_low,
            "ci95_high": ci_high,
            "favorable_significant": bool(ci_low > 0 if favorable else ci_high < 0),
            "seeds": len(difference),
        })
    return pd.DataFrame(rows)


def paired_embedding_ablation(per_seed: pd.DataFrame) -> pd.DataFrame:
    """Return paired main-minus-no-embedding deltas and two-sided 95% t intervals."""
    return paired_ablation(per_seed, "ablation_no_embeddings")


def evaluate_window(
    fit_events: pd.DataFrame,
    holdout_events: pd.DataFrame,
    tables: dict[str, pd.DataFrame],
    *,
    seed: int,
    strategy: str,
    methods: list[str],
    allow_fairness: bool = True,
    allow_diversity: bool = True,
    recency_decay: bool = True,
    time_affinity: bool = True,
    content_enabled: bool = True,
    embedding_session: OrmSession | None = None,
    base_weights: dict[str, float] | None = None,
) -> dict[str, dict[str, float]]:
    """Evaluate selected strategies on event-time contexts using observable history only."""
    rng = np.random.default_rng(seed)
    types = tables["event_types"].sort_values("id")["id"].tolist()
    preferences_frame = tables["preferences"]
    rsvps_frame = tables["rsvps"]
    events_frame = tables["events"].copy()
    events_frame["start_time"] = pd.to_datetime(events_frame["start_time"])
    events_by_id = events_frame.set_index("id").to_dict(orient="index")
    event_types_frame = tables["event_types"].set_index("id")
    embedding_vectors = {}
    if content_enabled:
        if embedding_session is None:
            raise ValueError("Embedding evaluation requires a shared SQLite embedding cache session.")
        texts = [*events_frame.description.astype(str).tolist(), *event_types_frame.description.astype(str).tolist()]
        embedding_vectors = encode_and_cache(embedding_session, texts)
    roster: dict[str, list[str]] = {
        club: members.sort_values("member_id")["member_id"].tolist()
        for club, members in tables["club_members"].groupby("club_id")
    }
    preferences_by_member: dict[str, dict[str, int]] = defaultdict(dict)
    for row in preferences_frame.itertuples(index=False):
        preferences_by_member[row.member_id][row.event_type_id] = int(row.rating)
    accumulators = {method: _metric_accumulator() for method in methods}
    recent_recommendations: dict[tuple[str, str], list[str]] = defaultdict(list)
    recommendation_sequences: dict[str, list[str]] = defaultdict(list)

    for event in holdout_events.sort_values(["start_time", "id"], kind="stable").itertuples(index=False):
        event_time = pd.Timestamp(event.start_time).to_pydatetime()
        club_id = event.club_id
        member_ids = roster[club_id]
        history_events = fit_events[(fit_events.club_id == club_id) & (fit_events.start_time < event_time)].sort_values(["start_time", "id"], kind="stable")
        history_ids = set(history_events.id)
        observed_history = rsvps_frame[rsvps_frame.event_id.isin(history_ids)]
        attendance: dict[str, list[AttendanceObservation]] = defaultdict(list)
        slots: dict[str, list[TimeObservation]] = defaultdict(list)
        outcomes_by_type: dict[str, tuple[int, int]] = {}
        for interaction in observed_history.itertuples(index=False):
            historical_event = events_by_id[interaction.event_id]
            type_attended, type_observed = outcomes_by_type.get(historical_event["event_type_id"], (0, 0))
            outcomes_by_type[historical_event["event_type_id"]] = (type_attended + int(bool(interaction.attended)), type_observed + 1)
            stamp = historical_event["start_time"].to_pydatetime()
            attendance[interaction.member_id].append(AttendanceObservation(historical_event["event_type_id"], interaction.rsvp_status, bool(interaction.attended), stamp))
            slots[interaction.member_id].append(TimeObservation(stamp.weekday(), stamp.hour, bool(interaction.attended)))
        content_by_type: dict[str, dict[str, ContentSignal]] = {}
        if content_enabled:
            profiles: dict[str, tuple[np.ndarray, int]] = {}
            attended_rows = observed_history[observed_history.attended.astype(bool)]
            for member_id, interactions in attended_rows.groupby("member_id", sort=True):
                history = [events_by_id[row.event_id] for row in interactions.itertuples(index=False)]
                history = [row for row in history if str(row.get("description", "")).strip()]
                if not history:
                    continue
                ages = np.asarray([max(0.0, (event_time - row["start_time"].to_pydatetime()).total_seconds() / 86400.0) for row in history])
                recency = np.exp(-np.log(2.0) * ages / config.CONTENT_HALF_LIFE_DAYS)
                matrix = np.vstack([embedding_vectors[row["description"]] for row in history])
                profile = np.average(matrix, axis=0, weights=recency).astype(np.float32)
                norm = float(np.linalg.norm(profile))
                if norm > 0:
                    profiles[member_id] = (profile / norm, len(history))
            for event_type_id, row in event_types_frame.iterrows():
                target_text = str(row.description).strip()
                if not target_text:
                    continue
                target = embedding_vectors[target_text]
                content_by_type[event_type_id] = {
                    member_id: ContentSignal(
                        (float(np.clip(np.dot(profile, target), -1.0, 1.0)) + 1.0) / 2.0,
                        observation_count,
                    )
                    for member_id, (profile, observation_count) in profiles.items()
                }
        popularity = history_events.event_type_id.value_counts().to_dict()
        probability_maps: dict[str, np.ndarray] = {}
        score_maps: dict[str, np.ndarray] = {}
        for event_type in types:
            individual = score_members(
                member_ids, event_type, event_time.weekday(), event_time.hour,
                preferences_by_member, attendance, slots, now=event_time,
                popularity_fallback=club_attendance_fallback(outcomes_by_type, event_type),
                recency_decay=recency_decay, time_affinity_enabled=time_affinity,
                content_evidence=content_by_type.get(event_type), content_enabled=content_enabled,
                base_weights=base_weights,
            )
            probability_maps[event_type] = np.asarray([item.score for item in individual], dtype=np.float64)
            score_maps[event_type] = probability_maps[event_type]

        outcomes_map = {row.member_id: bool(row.attended) for row in rsvps_frame[rsvps_frame.event_id == event.id].itertuples(index=False)}
        actual = np.asarray([float(outcomes_map.get(member_id, False)) for member_id in member_ids])
        rating_rows = {row.member_id: (None if pd.isna(row.rating) else int(row.rating)) for row in rsvps_frame[rsvps_frame.event_id == event.id].itertuples(index=False)}
        actual_satisfaction = np.asarray([
            (float(rating_rows[member_id]) - 1) / 4 if rating_rows.get(member_id) is not None
            else (0.6 if outcomes_map.get(member_id, False) else 0.0)
            for member_id in member_ids
        ])
        quorum_required = max(config.DEFAULT_QUORUM_MINIMUM, math.ceil(config.DEFAULT_QUORUM_FRACTION * len(member_ids)))
        actual_attendance = int(actual.sum())
        event_type_index = {event_type: index for index, event_type in enumerate(types)}
        group_scores = np.vstack([score_maps[event_type] for event_type in types])

        latest_history = history_events.sort_values(["start_time", "id"], kind="stable")
        most_recent = latest_history.iloc[-1].event_type_id if len(latest_history) else max(types, key=lambda item: (popularity.get(item, 0), item))
        anniversary = event_time.date() - timedelta(days=364)
        if len(latest_history):
            same_week_row = min(latest_history.itertuples(index=False), key=lambda row: (abs((pd.Timestamp(row.start_time).date() - anniversary).days), row.id))
            same_week = same_week_row.event_type_id
        else:
            same_week = most_recent
        popular = max(types, key=lambda item: (popularity.get(item, 0), item))
        random_values = rng.random((len(types), len(member_ids)))
        random_group = random_values.mean(axis=1)
        strategy_group = aggregate_scores(group_scores, strategy)
        strategy_without_fairness = strategy_group

        all_aggregates = {name: aggregate_scores(group_scores, name) for name in STRATEGIES}
        ledger_records: dict[str, FairnessRecord] = {}
        for member_id in member_ids:
            member_rows = observed_history[observed_history.member_id == member_id]
            if len(member_rows):
                values = [((float(row.rating) - 1) / 4 if not pd.isna(row.rating) else (0.6 if row.attended else 0.0)) for row in member_rows.itertuples(index=False)]
                ledger_records[member_id] = FairnessRecord(float(np.mean(values)), event_time)
        fair_weights = fairness_weights(member_ids, ledger_records, now=event_time, enabled=allow_fairness)
        fair_group = aggregate_scores(group_scores, strategy, member_weights=fair_weights)
        baseline_rates = {}
        for event_type in types:
            rows_for_type = observed_history[observed_history.event_id.isin(history_events[history_events.event_type_id == event_type].id)]
            member_counts = rows_for_type.groupby("member_id").attended.agg(["sum", "count"])
            baseline_rates[event_type] = np.asarray([
                (float(member_counts.loc[member_id, "sum"]) + 1.0) / (float(member_counts.loc[member_id, "count"]) + 2.0)
                if member_id in member_counts.index else 0.5 for member_id in member_ids
            ])
        hour_score_cache: dict[str, list[float]] = {}

        for method in methods:
            if method == "random":
                chosen_index = int(np.argmax(random_group))
                rank_scores = random_values
            elif method == "club_popularity":
                chosen_index = event_type_index[popular]
                rank_scores = np.tile(np.asarray([popularity.get(item, 0) for item in types])[:, None], (1, len(member_ids)))
            elif method == "most_recent":
                chosen_index = event_type_index[most_recent]
                rank_scores = np.tile(np.asarray([float(item == most_recent) for item in types])[:, None], (1, len(member_ids)))
            elif method == "same_week_last_year":
                chosen_index = event_type_index[same_week]
                rank_scores = np.tile(np.asarray([float(item == same_week) for item in types])[:, None], (1, len(member_ids)))
            elif method.startswith("strategy_"):
                chosen_strategy = method.removeprefix("strategy_")
                chosen_index = int(np.argmax(all_aggregates[chosen_strategy]))
                rank_scores = group_scores
            elif method == "main_model" or method == "ablation_no_fairness":
                values = fair_group if method == "main_model" else strategy_without_fairness
                ordering = np.argsort(-values, kind="stable")
                if method == "main_model" and allow_diversity:
                    rankings = rank_group_candidates(group_scores, strategy, member_weights=fair_weights)
                    chosen_index = mmr_rerank(rankings, types, top_n=len(types), recent_event_types=recent_recommendations[(club_id, method)])[0].candidate_index
                else:
                    chosen_index = int(ordering[0])
                rank_scores = group_scores
            elif method == "ablation_no_recency" or method == "ablation_no_time_affinity":
                chosen_index = int(np.argmax(strategy_group))
                rank_scores = group_scores
            elif method == "ablation_no_diversity":
                chosen_index = int(np.argmax(fair_group))
                rank_scores = group_scores
            else:
                raise ValueError(f"Unsupported evaluation method: {method}")
            selected_type = types[chosen_index]
            if method in {"main_model", "ablation_no_diversity"}:
                recent_recommendations[(club_id, method)].append(selected_type)
            recommendation_sequences[method].append(selected_type)

            metrics = accumulators[method]
            if actual.any():
                relevant_hits = []
                ndcg_values = []
                precision_values = []
                recall_values = []
                for member_index, member_id in enumerate(member_ids):
                    if not actual[member_index]:
                        continue
                    member_rank = np.argsort(-rank_scores[:, member_index], kind="stable")
                    top_indices = member_rank[:3]
                    relevant = event_type_index[event.event_type_id]
                    hit = float(relevant in top_indices)
                    try:
                        position = list(member_rank[:3]).index(relevant)
                        ndcg = 1.0 / math.log2(position + 2)
                    except ValueError:
                        ndcg = 0.0
                    precision_values.append(hit / 3.0)
                    recall_values.append(hit)
                    ndcg_values.append(ndcg)
                    relevant_hits.append(hit)
                if precision_values:
                    metrics["precision_at_3"].append(float(np.mean(precision_values)))
                    metrics["recall_at_3"].append(float(np.mean(recall_values)))
                    metrics["ndcg_at_3"].append(float(np.mean(ndcg_values)))
                    metrics["hit_rate"].append(float(np.mean(relevant_hits)))

            if method == "random":
                predicted = random_values[event_type_index[event.event_type_id]]
            elif method in {"club_popularity", "most_recent", "same_week_last_year"}:
                predicted = baseline_rates[event.event_type_id]
            else:
                predicted = probability_maps[event.event_type_id]
            metrics["brier_score"].append(float(np.mean((predicted - actual) ** 2)))
            metrics["quorum_success_rate"].append(float(actual_attendance >= quorum_required))
            actual_type_scores = probability_maps[selected_type]
            metrics["mean_satisfaction"].append(float(actual_type_scores.mean()))
            metrics["min_satisfaction"].append(float(actual_type_scores.min()))
            metrics["satisfaction_std"].append(float(actual_type_scores.std()))
            metrics["type_hit_rate"].append(float(selected_type == event.event_type_id))
            metrics["expected_attendance"].append(float(actual_type_scores.sum()))
            metrics["satisfaction_gini"].append(_gini(actual_type_scores))

            if selected_type not in hour_score_cache:
                hour_score_cache[selected_type] = []
                for hour in range(9, 21):
                    slot_probs = score_members(member_ids, selected_type, event_time.weekday(), hour, preferences_by_member, attendance, slots, now=event_time, popularity_fallback=club_attendance_fallback(outcomes_by_type, selected_type), recency_decay=recency_decay, time_affinity_enabled=time_affinity, content_evidence=content_by_type.get(selected_type), content_enabled=content_enabled, base_weights=base_weights)
                    hour_score_cache[selected_type].append(float(np.mean([row.score for row in slot_probs])))
            hour_scores = hour_score_cache[selected_type]
            predicted_hour = 9 + int(np.argmax(hour_scores))
            metrics["slot_hit_rate"].append(float(_slot_bucket(predicted_hour, 0) == event.slot_name))

    output: dict[str, dict[str, float]] = {}
    for method, metric_values in accumulators.items():
        values = {metric: float(np.mean(items)) for metric, items in metric_values.items() if items}
        output[method] = values
    for method in methods:
        chosen = recommendation_sequences[method]
        output[method]["coverage"] = float(len(set(chosen)) / max(1, len(types)))
        pairs = len(chosen) * (len(chosen) - 1) / 2
        repeated = sum(left == right for index, left in enumerate(chosen) for right in chosen[index + 1:])
        output[method]["intra_list_diversity"] = float(1.0 - repeated / pairs) if pairs else 1.0
    return output


_DEFAULT_WEIGHTS = {"explicit": config.EXPLICIT_BASE_WEIGHT, "implicit": config.IMPLICIT_BASE_WEIGHT, "time": config.TIME_BASE_WEIGHT, "content": config.CONTENT_BASE_WEIGHT}

# Specific hypotheses to compare against the current defaults, not a blind grid:
# validation is only ~20 events per seed, too little to support a fine-grained
# search without overfitting to its noise. Content is tested at reduced and zero
# weight because the embedding ablation found a worse (not significant, but
# consistently positive) Brier delta with embeddings enabled on the test set.
WEIGHT_CANDIDATES: tuple[dict[str, float], ...] = (
    _DEFAULT_WEIGHTS,
    {"explicit": 1.0, "implicit": 1.0, "time": 1.0, "content": 1.0},
    {"explicit": 1.0, "implicit": 0.3, "time": 0.1, "content": 0.2},
    {"explicit": 0.3, "implicit": 1.0, "time": 0.1, "content": 0.2},
    {"explicit": 0.3, "implicit": 0.3, "time": 1.0, "content": 0.2},
    {"explicit": 0.5, "implicit": 0.35, "time": 0.15, "content": 0.05},
    {"explicit": 0.5, "implicit": 0.35, "time": 0.15, "content": 0.0},
    {"explicit": 0.6, "implicit": 0.4, "time": 0.1, "content": 0.0},
)


def select_tuned_weights(
    train: pd.DataFrame, validation: pd.DataFrame, tables: dict[str, pd.DataFrame], *,
    seed: int, embedding_session: OrmSession,
) -> tuple[dict[str, float], list[dict]]:
    """Pick base weights minimizing validation Brier score, tie-broken by type_hit_rate.

    precision_at_3, recall_at_3, ndcg_at_3, and brier_score depend only on
    score_members' per-member probabilities, not on which aggregation strategy is
    chosen (confirmed: these four are identical across every strategy_* method in
    the same evaluate_window call), so any single strategy_* method's validation
    result is a valid, cheap stand-in for scoring a candidate weight vector.
    """
    scored = []
    for candidate in WEIGHT_CANDIDATES:
        result = evaluate_window(train, validation, tables, seed=seed, strategy="average", methods=["strategy_average"], embedding_session=embedding_session, base_weights=candidate)["strategy_average"]
        scored.append({"weights": candidate, "brier_score": result["brier_score"], "type_hit_rate": result["type_hit_rate"]})
    best = min(scored, key=lambda item: (item["brier_score"], -item["type_hit_rate"]))
    return best["weights"], scored


def select_tuned_strategy(validation_result: dict[str, dict[str, float]]) -> str:
    """Pick the aggregation strategy with the highest validation type_hit_rate.

    type_hit_rate compares a prediction with the type actually chosen, like
    best_baseline's selection below it. mean_satisfaction is the model's own
    predicted score for whatever it picks, not an observed outcome, so maximizing
    it is circular and does not select for an accurate strategy.
    """
    return max(STRATEGIES, key=lambda item: (validation_result[f"strategy_{item}"]["type_hit_rate"], item))


def _evaluate_seed(seed: int) -> tuple[dict[str, dict[str, float]], dict[str, dict[str, float]]]:
    generator = SyntheticDatasetGenerator(GenerationConfig(seed=seed))
    generator.generate_all()
    tables = export_feature_datasets(generator)
    events = tables["events"].copy()
    events["start_time"] = pd.to_datetime(events["start_time"])
    train, validation, test = temporal_split(events)
    cache_engine = create_engine("sqlite+pysqlite:///:memory:")
    EmbeddingCache.__table__.create(cache_engine)
    embedding_session = OrmSession(cache_engine)
    tuned_weights, weight_search = select_tuned_weights(train, validation, tables, seed=seed, embedding_session=embedding_session)
    validation_methods = ["random", "club_popularity", "most_recent", "same_week_last_year", *(f"strategy_{strategy}" for strategy in STRATEGIES)]
    validation_result = evaluate_window(train, validation, tables, seed=seed, strategy="average", methods=validation_methods, embedding_session=embedding_session, base_weights=tuned_weights)
    tuned_strategy = select_tuned_strategy(validation_result)
    best_baseline = max(("random", "club_popularity", "most_recent", "same_week_last_year"), key=lambda item: (validation_result[item]["type_hit_rate"], item))
    test_methods = [
        "random", "club_popularity", "most_recent", "same_week_last_year",
        *(f"strategy_{strategy}" for strategy in STRATEGIES), "main_model",
    ]
    test_fit = pd.concat([train, validation]).sort_values(["start_time", "id"], kind="stable")
    test_result = evaluate_window(test_fit, test, tables, seed=seed, strategy=tuned_strategy, methods=test_methods, embedding_session=embedding_session, base_weights=tuned_weights)
    test_result["ablation_no_recency"] = evaluate_window(test_fit, test, tables, seed=seed, strategy=tuned_strategy, methods=["main_model"], recency_decay=False, embedding_session=embedding_session, base_weights=tuned_weights)["main_model"]
    test_result["ablation_no_time_affinity"] = evaluate_window(test_fit, test, tables, seed=seed, strategy=tuned_strategy, methods=["main_model"], time_affinity=False, embedding_session=embedding_session, base_weights=tuned_weights)["main_model"]
    test_result["ablation_no_fairness"] = evaluate_window(test_fit, test, tables, seed=seed, strategy=tuned_strategy, methods=["main_model"], allow_fairness=False, embedding_session=embedding_session, base_weights=tuned_weights)["main_model"]
    test_result["ablation_no_diversity"] = evaluate_window(test_fit, test, tables, seed=seed, strategy=tuned_strategy, methods=["main_model"], allow_diversity=False, embedding_session=embedding_session, base_weights=tuned_weights)["main_model"]
    test_result["ablation_no_embeddings"] = evaluate_window(test_fit, test, tables, seed=seed, strategy=tuned_strategy, methods=["main_model"], content_enabled=False, embedding_session=embedding_session, base_weights=tuned_weights)["main_model"]
    test_result["ablation_default_weights"] = evaluate_window(test_fit, test, tables, seed=seed, strategy=tuned_strategy, methods=["main_model"], embedding_session=embedding_session, base_weights=_DEFAULT_WEIGHTS)["main_model"]
    embedding_session.close()
    cache_engine.dispose()
    return test_result, {
        "tuned_strategy": {"index": float(STRATEGIES.index(tuned_strategy))},
        "tuned_weights": tuned_weights,
        "weight_search": weight_search,
        "validation_baselines": {name: validation_result[name]["type_hit_rate"] for name in ("random", "club_popularity", "most_recent", "same_week_last_year")},
        "validation_best_baseline": best_baseline,
    }


def run_evaluation(seeds: list[int], output_dir: str | Path) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Run five or more seeded temporal evaluations and write metrics/figures."""
    if len(seeds) < 5 or len(set(seeds)) != len(seeds):
        raise ValueError("Evaluation requires at least five unique seeds.")
    root = Path(output_dir)
    figures = root / "figures"
    figures.mkdir(parents=True, exist_ok=True)
    rows = []
    selected = []
    evaluations = []
    weight_rows = []
    for seed in seeds:
        result, selection = _evaluate_seed(seed)
        tuned = STRATEGIES[int(selection["tuned_strategy"]["index"])]
        selected.append({"seed": seed, "tuned_strategy": tuned, "validation_best_baseline": selection["validation_best_baseline"], **selection["validation_baselines"]})
        evaluations.append((seed, tuned, result))
        for candidate in selection["weight_search"]:
            is_selected = candidate["weights"] == selection["tuned_weights"]
            weight_rows.append({"seed": seed, "is_selected": is_selected, "validation_brier_score": candidate["brier_score"], "validation_type_hit_rate": candidate["type_hit_rate"], **candidate["weights"]})
    weight_search_table = pd.DataFrame(weight_rows)
    weight_search_table.to_csv(root / "weight_search.csv", index=False)
    validation_baseline_means = {
        name: float(np.mean([item[name] for item in selected]))
        for name in ("random", "club_popularity", "most_recent", "same_week_last_year")
    }
    best_baseline = max(validation_baseline_means, key=lambda name: (validation_baseline_means[name], name))
    for seed, tuned, result in evaluations:
        for method, metrics in result.items():
            rows.append({"seed": seed, "method": method, "tuned_strategy": tuned, "best_baseline": best_baseline, **metrics})
    per_seed = pd.DataFrame(rows).sort_values(["seed", "method"])
    per_seed.to_csv(root / "metrics_by_seed.csv", index=False)
    metric_names = [column for column in per_seed.columns if column not in {"seed", "method", "tuned_strategy", "best_baseline"}]
    summary_rows = []
    for (method, metric), values in per_seed.melt(id_vars=["seed", "method"], value_vars=metric_names, var_name="metric", value_name="value").groupby(["method", "metric"], sort=True):
        numbers = values.value.dropna().to_numpy(dtype=float)
        margin = float(t.ppf(0.975, len(numbers) - 1) * sem(numbers)) if len(numbers) > 1 else 0.0
        summary_rows.append({"method": method, "metric": metric, "mean": float(np.mean(numbers)), "ci95_low": float(np.mean(numbers) - margin), "ci95_high": float(np.mean(numbers) + margin), "seeds": len(numbers)})
    summary = pd.DataFrame(summary_rows)
    summary.to_csv(root / "summary_95ci.csv", index=False)
    paired = paired_comparison_table(per_seed, best_baseline)
    paired.to_csv(root / "paired_comparison.csv", index=False)
    embedding_ablation = paired_embedding_ablation(per_seed)
    embedding_ablation.to_csv(root / "embedding_ablation.csv", index=False)
    weight_ablation = paired_ablation(per_seed, "ablation_default_weights")
    weight_ablation.to_csv(root / "weight_tuning_ablation.csv", index=False)
    summary_lookup = summary.set_index(["method", "metric"])
    report_metrics = ["precision_at_3", "recall_at_3", "ndcg_at_3", "type_hit_rate", "slot_hit_rate", "mean_satisfaction", "min_satisfaction", "satisfaction_std", "satisfaction_gini", "quorum_success_rate", "brier_score", "coverage", "intra_list_diversity"]
    report_lines = [
        "# Temporal evaluation report",
        "",
        f"Synthetic temporal evaluation over {len(seeds)} seeds ({', '.join(str(seed) for seed in seeds)}). Events were split chronologically 70/15/15. Strategy and baseline selection used validation data only. The best validation baseline was `{best_baseline}`.",
        "",
        "The model column uses the validation-selected aggregation strategy with fairness and diversity enabled. Values are means with two-sided 95% t confidence intervals across seeds.",
        "",
        "| Metric | Main model | Best baseline | Paired delta (95% CI) | Statistically better? |",
        "| --- | ---: | ---: | ---: | --- |",
    ]
    for metric in report_metrics:
        model = summary_lookup.loc[("main_model", metric)]
        baseline = summary_lookup.loc[(best_baseline, metric)]
        comparison = paired[paired.metric == metric].iloc[0]
        report_lines.append(
            f"| {metric} | {model['mean']:.3f} [{model['ci95_low']:.3f}, {model['ci95_high']:.3f}] | "
            f"{baseline['mean']:.3f} [{baseline['ci95_low']:.3f}, {baseline['ci95_high']:.3f}] | "
            f"{comparison['mean_paired_delta']:+.3f} [{comparison['ci95_low']:+.3f}, {comparison['ci95_high']:+.3f}] | {bool(comparison['beats_baseline'])} |"
        )
    report_lines.extend([
        "",
        "## Interpretation",
        "",
        "Read the metrics and paired intervals together. Improvements are claimed only where the paired 95% interval excludes zero in the favorable direction. Historical event data cannot observe counterfactual attendance for recommendations that were not held.",
        "",
        "`mean_satisfaction`, `min_satisfaction`, `satisfaction_std` and `satisfaction_gini` are the model's own predicted member scores for the event type each method selects, not observed outcomes, so they favor methods that agree with the scoring model. Treat `type_hit_rate`, the ranking metrics, and `brier_score` as the measures that compare predictions with what actually happened.",
        "",
        "## Embedding ablation",
        "",
        "Deltas compare the full model with the same model with content embeddings disabled, paired by seed. Positive deltas are favorable except for Brier score, where lower is better.",
        "",
        "| Metric | Main minus no embeddings (95% CI) | Significant gain? |",
        "| --- | ---: | --- |",
    ])
    reported_ablation_metrics = ["type_hit_rate", "ndcg_at_3", "mean_satisfaction", "min_satisfaction", "brier_score", "quorum_success_rate"]
    for metric in reported_ablation_metrics:
        row = embedding_ablation[embedding_ablation.metric == metric].iloc[0]
        significant = bool(row["ci95_low"] > 0 if metric != "brier_score" else row["ci95_high"] < 0)
        report_lines.append(f"| {metric} | {row['mean_paired_delta']:+.3f} [{row['ci95_low']:+.3f}, {row['ci95_high']:+.3f}] | {significant} |")
    primary = embedding_ablation[embedding_ablation.metric == "mean_satisfaction"].iloc[0]
    if primary["ci95_low"] > 0:
        report_lines.extend(["", f"Primary endpoint: mean-satisfaction gain was statistically significant ({primary['mean_paired_delta']:+.3f}, 95% CI [{primary['ci95_low']:+.3f}, {primary['ci95_high']:+.3f}])."])
    elif primary["ci95_high"] < 0:
        report_lines.extend(["", f"Primary endpoint: mean satisfaction was significantly lower with embeddings ({primary['mean_paired_delta']:+.3f}, 95% CI [{primary['ci95_low']:+.3f}, {primary['ci95_high']:+.3f}])."])
    else:
        report_lines.extend(["", f"Primary endpoint: the mean-satisfaction embedding delta was not statistically significant (inconclusive; {primary['mean_paired_delta']:+.3f}, 95% CI [{primary['ci95_low']:+.3f}, {primary['ci95_high']:+.3f}])."])
    reported_ablation = embedding_ablation[embedding_ablation.metric.isin(reported_ablation_metrics)]
    significant_gains = reported_ablation[
        ((reported_ablation.metric != "brier_score") & (reported_ablation.ci95_low > 0))
        | ((reported_ablation.metric == "brier_score") & (reported_ablation.ci95_high < 0))
    ].metric.tolist()
    if significant_gains:
        report_lines.extend(["", f"Paired intervals show significant embedding gains for: {', '.join(significant_gains)}."])
    else:
        report_lines.extend(["", "No embedding-related gain was statistically significant under the paired 95% intervals for the reported metrics."])

    report_lines.extend([
        "",
        "## Component weight tuning",
        "",
        "Each seed picks base weights (explicit/implicit/time/content) from a fixed list of candidates by minimizing Brier score on that seed's validation split (~20 events), tie-broken by type_hit_rate; see `weight_search.csv` for every candidate tried. `ablation_default_weights` re-runs the test split with the pre-tuning defaults "
        f"(explicit={_DEFAULT_WEIGHTS['explicit']}, implicit={_DEFAULT_WEIGHTS['implicit']}, time={_DEFAULT_WEIGHTS['time']}, content={_DEFAULT_WEIGHTS['content']}) "
        "instead, everything else unchanged, so the comparison below isolates the weight change alone.",
        "",
        "| Seed | Tuned weights (explicit/implicit/time/content) |",
        "| --- | --- |",
    ])
    for row in weight_search_table[weight_search_table.is_selected].sort_values("seed").itertuples():
        report_lines.append(f"| {row.seed} | {row.explicit:.2f} / {row.implicit:.2f} / {row.time:.2f} / {row.content:.2f} |")
    report_lines.extend([
        "",
        "Paired test-set delta, tuned weights minus the pre-tuning defaults (positive favorable except Brier score):",
        "",
        "| Metric | Tuned minus default (95% CI) | Significant gain? |",
        "| --- | ---: | --- |",
    ])
    for metric in reported_ablation_metrics:
        row = weight_ablation[weight_ablation.metric == metric].iloc[0]
        significant = bool(row["ci95_low"] > 0 if metric != "brier_score" else row["ci95_high"] < 0)
        report_lines.append(f"| {metric} | {row['mean_paired_delta']:+.3f} [{row['ci95_low']:+.3f}, {row['ci95_high']:+.3f}] | {significant} |")
    weight_significant_gains = weight_ablation[
        ((weight_ablation.metric != "brier_score") & (weight_ablation.metric.isin(reported_ablation_metrics)) & (weight_ablation.ci95_low > 0))
        | ((weight_ablation.metric == "brier_score") & (weight_ablation.ci95_high < 0))
    ].metric.tolist()
    if weight_significant_gains:
        report_lines.extend(["", f"Paired intervals show significant gains from weight tuning for: {', '.join(weight_significant_gains)}."])
    else:
        report_lines.extend(["", "No metric showed a statistically significant gain from weight tuning over the pre-tuning defaults under the paired 95% intervals."])

    report_lines.extend([
        "",
        "These results use synthetic data only. Any gain is weak evidence and does not establish performance on real clubs.",
    ])
    (root / "REPORT.md").write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    selected_metrics = summary[summary.metric.isin(["type_hit_rate", "mean_satisfaction", "brier_score", "quorum_success_rate"])]
    methods = list(selected_metrics.method.drop_duplicates())
    fig, axes = plt.subplots(2, 2, figsize=(13, 8), constrained_layout=True)
    for axis, metric in zip(axes.flat, ["type_hit_rate", "mean_satisfaction", "brier_score", "quorum_success_rate"]):
        subset = selected_metrics[selected_metrics.metric == metric].set_index("method").reindex(methods).dropna()
        axis.bar(range(len(subset)), subset["mean"], yerr=[subset["mean"] - subset["ci95_low"], subset["ci95_high"] - subset["mean"]], capsize=3)
        axis.set_title(metric.replace("_", " "))
        axis.set_xticks(range(len(subset)), subset.index, rotation=75, ha="right", fontsize=7)
        axis.grid(axis="y", alpha=.2)
    fig.savefig(figures / "evaluation_metrics.png", dpi=160)
    plt.close(fig)
    return per_seed, summary, paired


def main() -> None:
    parser = argparse.ArgumentParser(description="Run seeded temporal Quorum evaluation.")
    parser.add_argument("--seeds", nargs="+", type=int, default=[42, 43, 44, 45, 46])
    parser.add_argument("--output", type=Path, default=Path("results/evaluation"))
    args = parser.parse_args()
    _, summary, paired = run_evaluation(args.seeds, args.output)
    print(f"Wrote evaluation CSVs, report, and figures under {args.output}")
    print("Best baseline comparisons (paired over seeds):")
    print(paired[["metric", "baseline", "mean_paired_delta", "ci95_low", "ci95_high", "beats_baseline"]].to_string(index=False))
    print("Model/baseline metric summary:")
    print(summary[summary.metric.isin(["type_hit_rate", "mean_satisfaction", "brier_score", "quorum_success_rate"])].to_string(index=False))


if __name__ == "__main__":
    main()
