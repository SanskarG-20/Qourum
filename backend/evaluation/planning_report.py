"""Rebuild the planning evaluation from dated research tables.

Run ``python -m backend.evaluation.planning_report --seed 42`` from the repo root.
No held-out attendance or rating enters model fitting or candidate ranking.
"""

from __future__ import annotations

import argparse
import csv
import json
from datetime import date, datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from backend.planning.affinity import build_format_affinities
from backend.planning.aggregation import aggregate_candidate
from backend.planning.attendance_model import LogisticAttendanceModel
from backend.planning.baselines import popularity_baseline, random_baseline, repeat_last_baseline
from backend.planning.config import TIME_BLOCK_STARTS
from backend.planning.diversity import rerank_diverse
from backend.planning.models import PlanCandidate, PlanFormat, PlanMember, PlanObservation
from backend.synthetic_data.dataset_validation import TABLE_COLUMNS, validate_research_tables
from backend.synthetic_data.research_dataset import ResearchDatasetGenerator, ResearchGenerationConfig
from backend.evaluation.plan_reliability import reliability_sweep

ROOT = Path(__file__).resolve().parents[2]
CONFLICT_LEVELS = (0.0, 0.25, 0.5, 0.75, 1.0)
METHODS = ("model", "random", "popularity", "repeat_last")
STRATEGIES = ("average", "least_misery", "fairness_aware")


def temporal_split(events: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Split each club's dated events 70/30; all test dates follow train dates."""
    train, test = [], []
    for _, club_events in events.groupby("club_id", sort=True):
        ordered = club_events.sort_values(["date", "event_id"], kind="stable")
        boundary = max(1, min(len(ordered) - 1, int(len(ordered) * 0.7)))
        train.append(ordered.iloc[:boundary])
        test.append(ordered.iloc[boundary:])
    return pd.concat(train, ignore_index=True), pd.concat(test, ignore_index=True)


def _formats(frame: pd.DataFrame) -> list[PlanFormat]:
    return [PlanFormat(
        format_id=str(row.format_id), name=str(row.name), event_type_id=str(row.format_id),
        category=str(row.category), skill_level=str(row.skill_level),
        duration_minutes=int(row.duration_hrs) * 60, fee_inr=int(row.typical_fee),
        modes=("in_person", "online"), min_capacity=int(row.min_capacity),
        max_capacity=int(row.max_capacity),
    ) for row in frame.itertuples(index=False)]


def _candidate(fmt: PlanFormat, event: object) -> PlanCandidate:
    day = date.fromisoformat(str(event.date))
    block = str(event.time_block)
    return PlanCandidate(
        format_id=fmt.format_id, event_type_id=fmt.event_type_id, event_date=day,
        time_block=block, start=datetime.combine(day, TIME_BLOCK_STARTS[block]),
        mode=str(event.mode), fee_inr=int(event.fee), capacity=int(event.capacity),
        min_capacity=fmt.min_capacity, category=fmt.category,
        skill_level=fmt.skill_level, duration_minutes=fmt.duration_minutes,
    )


def _observations(events: pd.DataFrame, attendance: pd.DataFrame) -> list[PlanObservation]:
    joined = attendance.merge(events[["event_id", "format_id", "date", "time_block", "mode", "fee"]], on="event_id")
    return [PlanObservation(
        member_id=str(row.member_id), format_id=str(row.format_id), time_block=str(row.time_block),
        fee_inr=int(row.fee), mode=str(row.mode), attended=bool(row.attended),
        rating=None if pd.isna(row.rating) else int(row.rating),
        timestamp=datetime.combine(date.fromisoformat(str(row.date)), TIME_BLOCK_STARTS[str(row.time_block)]),
    ) for row in joined.itertuples(index=False)]


def _gini(values: np.ndarray) -> float:
    """Gini coefficient for nonnegative satisfaction scores."""
    if not len(values) or values.sum() == 0:
        return 0.0
    ordered = np.sort(values)
    n = len(ordered)
    return float((2 * np.dot(np.arange(1, n + 1), ordered) / (n * ordered.sum())) - (n + 1) / n)


def _dissatisfaction(observations: list[PlanObservation], member_ids: list[str]) -> dict[str, float]:
    recent: dict[str, list[PlanObservation]] = {member_id: [] for member_id in member_ids}
    for item in observations:
        if item.member_id in recent and item.rating is not None:
            recent[item.member_id].append(item)
    return {
        member_id: float(np.mean([(5 - item.rating) / 4 for item in sorted(items, key=lambda x: x.timestamp or datetime.min)[-10:]])) if items else 0.0
        for member_id, items in recent.items()
    }


def evaluate_tables(tables: dict[str, pd.DataFrame], seed: int, source: str) -> dict:
    """Fit only on older events and score newer organizer choices and attendance."""
    validate_research_tables(tables)
    train, test = temporal_split(tables["events"])
    formats = _formats(tables["formats"])
    categories = [fmt.category for fmt in formats]
    attendance = tables["attendance"]
    error: dict[str, list[float]] = {name: [] for name in METHODS}
    hits: dict[str, list[float]] = {name: [] for name in METHODS}
    prediction_rows: list[dict] = []
    conflict_rows: list[dict] = []
    ablation_values: dict[tuple[bool, bool], list[tuple[float, float, float]]] = {
        (fairness, diversity): [] for fairness in (False, True) for diversity in (False, True)
    }
    for club_index, club in enumerate(tables["clubs"].itertuples(index=False)):
        club_id = str(club.club_id)
        member_rows = tables["members"].loc[tables["members"].club_id == club_id]
        member_ids = member_rows.member_id.astype(str).tolist()
        members = [PlanMember(str(row.member_id), int(row.max_fee), str(row.mode_pref)) for row in member_rows.itertuples(index=False)]
        club_train = train.loc[train.club_id == club_id]
        club_test = test.loc[test.club_id == club_id].sort_values(["date", "event_id"])
        observations = _observations(club_train, attendance)
        affinities = build_format_affinities(member_ids, formats, observations)
        model = LogisticAttendanceModel(seed=seed)
        model.fit(observations, formats)
        dissatisfaction = _dissatisfaction(observations, member_ids)
        satisfaction = np.asarray([[affinities[(member_id, fmt.format_id)].probability for member_id in member_ids]
                                   for fmt in formats], dtype=float)
        strategy_scores = {name: [] for name in STRATEGIES}
        for event_index, event in enumerate(club_test.itertuples(index=False)):
            candidates = [_candidate(fmt, event) for fmt in formats]
            matrix = {
                "model": model.predict(member_ids, candidates, formats, members, observations, affinities),
                "random": random_baseline(member_ids, candidates, seed=seed + club_index * 10000 + event_index),
                "popularity": popularity_baseline(member_ids, candidates, observations),
                "repeat_last": repeat_last_baseline(member_ids, candidates, observations),
            }
            chosen_index = next(i for i, fmt in enumerate(formats) if fmt.format_id == str(event.format_id))
            actual = int(event.attended_count)
            for name, probabilities in matrix.items():
                predicted = min(float(probabilities[chosen_index].sum()), int(event.capacity))
                error[name].append(abs(predicted - actual))
                ranking = sorted(range(len(formats)), key=lambda i: (-float(probabilities[i].sum()), formats[i].format_id))
                hits[name].append(float(chosen_index in ranking[:3]))
                prediction_rows.append({"club_id": club_id, "event_id": str(event.event_id), "date": str(event.date),
                                        "method": name, "actual_attendance": actual,
                                        "predicted_attendance": round(predicted, 6), "hit_at_3": int(chosen_index in ranking[:3])})

            probabilities = matrix["model"]
            for strategy in STRATEGIES:
                scores = [aggregate_candidate(dict(zip(member_ids, row.tolist())), strategy, dissatisfaction)[0] for row in satisfaction]
                winner = max(range(len(formats)), key=lambda i: (scores[i], -i))
                values = satisfaction[winner]
                strategy_scores[strategy].append((float(values.min()), _gini(values)))
            for fairness in (False, True):
                strategy = "fairness_aware" if fairness else "average"
                scores = [aggregate_candidate(dict(zip(member_ids, row.tolist())), strategy, dissatisfaction)[0] for row in satisfaction]
                ranked = sorted(range(len(formats)), key=lambda i: (-scores[i], i))
                for diversity in (False, True):
                    selected = rerank_diverse(ranked, scores, categories, top_k=3) if diversity else ranked[:3]
                    minima = [float(satisfaction[i].min()) for i in selected]
                    turnout = [min(float(probabilities[i].sum()), candidates[i].capacity) for i in selected]
                    ablation_values[(fairness, diversity)].append((float(np.mean(minima)), float(np.mean(turnout)), len({categories[i] for i in selected}) / 3))
        for strategy, values in strategy_scores.items():
            if values:
                conflict_rows.append({
                    "club": str(club.name), "conflict_level": float(club.conflict_level),
                    "strategy": strategy, "minimum_satisfaction": round(float(np.mean([v[0] for v in values])), 4),
                    "gini": round(float(np.mean([v[1] for v in values])), 4), "test_events": len(values),
                })
    baseline_rows = [{"method": name, "mae_attendance": round(float(np.mean(error[name])), 4),
                      "hit_at_3": round(float(np.mean(hits[name])), 4), "test_events": len(error[name])} for name in METHODS]
    ablations = [{"fairness": fairness, "diversity": diversity,
                  "minimum_satisfaction": round(float(np.mean([v[0] for v in values])), 4),
                  "expected_turnout": round(float(np.mean([v[1] for v in values])), 4),
                  "category_coverage_at_3": round(float(np.mean([v[2] for v in values])), 4)}
                 for (fairness, diversity), values in ablation_values.items()]
    return {"source": source, "status": "available", "train_events": len(train), "test_events": len(test),
            "train_end": str(train.date.max()), "test_start": str(test.date.min()),
            "baselines": baseline_rows, "conflict_sweep": sorted(conflict_rows, key=lambda r: (r["conflict_level"], r["strategy"])),
            "ablations": ablations, "predictions": sorted(prediction_rows, key=lambda r: (r["club_id"], r["date"], r["event_id"], r["method"]))}


def _read_real_csv(directory: Path) -> dict[str, pd.DataFrame]:
    """Real records are loaded independently; synthetic rows are never merged in."""
    tables = {}
    for name, columns in TABLE_COLUMNS.items():
        path = directory / f"{name}.csv"
        if not path.is_file():
            raise ValueError(f"Real dataset requires {path}")
        frame = pd.read_csv(path)
        missing = set(columns) - set(frame.columns)
        if missing:
            raise ValueError(f"{path} missing columns: {', '.join(sorted(missing))}")
        tables[name] = frame
    validate_research_tables(tables)
    return tables


def _write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def _plot(report: dict, target: Path, stem: str) -> None:
    baseline = report["baselines"]
    fig, axes = plt.subplots(1, 2, figsize=(10, 3.5), layout="constrained")
    labels = [r["method"].replace("_", " ") for r in baseline]
    axes[0].bar(labels, [r["mae_attendance"] for r in baseline], color="#317c83")
    axes[0].set_ylabel("MAE (people)")
    axes[0].set_title("Attendance count error · lower is better")
    axes[1].bar(labels, [r["hit_at_3"] for r in baseline], color="#a57139")
    axes[1].set_ylim(0, 1)
    axes[1].set_ylabel("Hit@3")
    axes[1].set_title("Agreement with past format choices")
    for ax in axes:
        ax.tick_params(axis="x", labelrotation=18)
    fig.savefig(target / f"{stem}-baselines.png", dpi=130, metadata={"Software": "Quorum"})
    plt.close(fig)
    fig, axes = plt.subplots(1, 2, figsize=(10, 3.5), layout="constrained")
    for strategy in STRATEGIES:
        rows = sorted((r for r in report["conflict_sweep"] if r["strategy"] == strategy), key=lambda r: r["conflict_level"])
        for ax, key in zip(axes, ("minimum_satisfaction", "gini")):
            ax.plot([r["conflict_level"] for r in rows], [r[key] for r in rows], marker="o", label=strategy.replace("_", " "))
    axes[0].set_ylabel("Minimum predicted satisfaction")
    axes[1].set_ylabel("Gini of predicted satisfaction")
    for ax in axes:
        ax.set_xlabel("Club conflict level")
        ax.set_xlim(0, 1)
        ax.legend(fontsize=8)
    fig.savefig(target / f"{stem}-conflict.png", dpi=130, metadata={"Software": "Quorum"})
    plt.close(fig)
    fig, axes = plt.subplots(1, 2, figsize=(10, 3.5), layout="constrained")
    ablations = report["ablations"]
    labels = [f"F {'on' if r['fairness'] else 'off'} / D {'on' if r['diversity'] else 'off'}" for r in ablations]
    axes[0].bar(labels, [r["minimum_satisfaction"] for r in ablations], color="#317c83")
    axes[0].set_ylabel("Minimum predicted satisfaction")
    axes[1].bar(labels, [r["category_coverage_at_3"] for r in ablations], color="#a57139")
    axes[1].set_ylim(0, 1)
    axes[1].set_ylabel("Category coverage@3")
    for ax in axes:
        ax.tick_params(axis="x", labelrotation=18)
    fig.savefig(target / f"{stem}-ablations.png", dpi=130, metadata={"Software": "Quorum"})
    plt.close(fig)


def generate_report(seed: int, output_dir: Path, public_dir: Path, real_csv_dir: Path | None = None) -> dict:
    """Regenerate JSON, CSV tables, and PNG charts with a fixed seed."""
    config = ResearchGenerationConfig(seed=seed, num_clubs=5, club_conflict_levels=CONFLICT_LEVELS)
    synthetic = evaluate_tables(ResearchDatasetGenerator(config).generate(), seed, "synthetic")
    reliability = reliability_sweep(seed)
    real = evaluate_tables(_read_real_csv(real_csv_dir), seed, "real") if real_csv_dir else {
        "source": "real", "status": "unavailable", "reason": "No real club records supplied. No real-data metrics are reported."
    }
    result = {"seed": seed, "methodology": "Per-club chronological 70/30 train/test split; model and baselines fit on older events only.",
              "hit_caveat": "Hit@3 measures agreement with organizers' past format choices, not recommendation correctness.",
              "satisfaction_caveat": "Conflict and ablation satisfaction values are affinity estimates for candidate formats, not observed counterfactual outcomes. The synthetic sweep uses one club per conflict level, so other club differences may affect the trend. Synthetic gains are weak evidence for real clubs.",
              "synthetic": synthetic, "real": real, "reliability": reliability}
    output_dir.mkdir(parents=True, exist_ok=True)
    public_dir.mkdir(parents=True, exist_ok=True)
    _write_csv(output_dir / "synthetic-reliability-sweep.csv", reliability["cases"])
    for name, section in (("synthetic", synthetic), ("real", real)):
        if section["status"] == "available":
            for table in ("baselines", "conflict_sweep", "ablations", "predictions"):
                _write_csv(output_dir / f"{name}-{table}.csv", section[table])
            _plot(section, public_dir, name)
        else:
            for table in ("baselines", "conflict_sweep", "ablations", "predictions"):
                (output_dir / f"{name}-{table}.csv").unlink(missing_ok=True)
            for chart in ("baselines", "conflict", "ablations"):
                (public_dir / f"{name}-{chart}.png").unlink(missing_ok=True)
    payload = json.dumps(result, indent=2, sort_keys=True, allow_nan=False) + "\n"
    (output_dir / "report.json").write_text(payload, encoding="utf-8")
    (public_dir / "report.json").write_text(payload, encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--real-csv-dir", type=Path, help="Directory with all seven real research CSV tables")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "results" / "planning_evaluation")
    parser.add_argument("--public-dir", type=Path, default=ROOT / "public" / "evaluation")
    args = parser.parse_args()
    report = generate_report(args.seed, args.output_dir, args.public_dir, args.real_csv_dir)
    for name in ("synthetic", "real"):
        section = report[name]
        print(f"{name}: {section['status']}" + (f"; train={section['train_events']}, test={section['test_events']}" if section["status"] == "available" else f"; {section['reason']}"))
    print(f"Saved tables: {args.output_dir}")
    print(f"Saved page data and charts: {args.public_dir}")


if __name__ == "__main__":
    main()
