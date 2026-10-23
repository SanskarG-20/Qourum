"""Pluggable group aggregation, fairness weighting, and MMR reranking."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Mapping, Sequence

import numpy as np
from scipy.stats import rankdata

from . import config

STRATEGIES = (
    "average",
    "least_misery",
    "most_pleasure",
    "multiplicative",
    "borda",
    "approval",
    "average_without_misery",
)


@dataclass(frozen=True)
class FairnessRecord:
    """Latest satisfaction and update time retained for one member."""

    satisfaction: float | None
    updated_at: datetime | None


@dataclass(frozen=True)
class GroupRanking:
    """Candidate ranking and unweighted per-member satisfaction evidence."""

    candidate_index: int
    strategy_score: float
    group_mean: float
    group_min: float
    group_std: float
    satisfactions: tuple[float, ...]


def fairness_weights(
    member_ids: Sequence[str], ledger: Mapping[str, FairnessRecord], *, now: datetime,
    enabled: bool = True,
) -> np.ndarray:
    """Give a bounded, exponentially decaying boost to historically underserved members.

    The multiplier is 1 + max_boost * exp(-ln(2)*age/half_life) *
    max(0, target-satisfaction)/target. Members without prior evidence keep
    unit weight; weights are normalized to mean one for stable group scales.
    """
    weights = np.ones(len(member_ids), dtype=np.float64)
    if enabled:
        for index, member_id in enumerate(member_ids):
            record = ledger.get(member_id)
            if record is None or record.satisfaction is None or record.updated_at is None:
                continue
            if not 0.0 <= record.satisfaction <= 1.0:
                raise ValueError("Fairness satisfaction values must be in [0, 1].")
            age_days = max(0.0, (now - record.updated_at).total_seconds() / 86400.0)
            decay = np.exp(-np.log(2.0) * age_days / config.FAIRNESS_HALF_LIFE_DAYS)
            deficit = max(0.0, config.FAIRNESS_TARGET_SATISFACTION - record.satisfaction) / config.FAIRNESS_TARGET_SATISFACTION
            weights[index] += config.FAIRNESS_BOOST_MAX * decay * deficit
    if len(weights):
        weights /= weights.mean()
    return weights


def aggregate_scores(
    satisfaction_matrix: Sequence[Sequence[float]],
    strategy: str,
    *,
    member_weights: Sequence[float] | None = None,
    approval_threshold: float = config.APPROVAL_THRESHOLD,
    misery_threshold: float = config.MISERY_THRESHOLD,
) -> np.ndarray:
    """Return one deterministic [0,1] ranking score per candidate.

    `average_without_misery` averages only approvals above the misery floor,
    then scales by the group's approved fraction to avoid rewarding one outlier.
    Borda uses average ranks for ties; multiplicative uses a weighted geometric
    mean with a small numerical floor.
    """
    values = np.asarray(satisfaction_matrix, dtype=np.float64)
    if values.ndim != 2 or values.shape[1] == 0:
        raise ValueError("Satisfaction matrix must be candidates by non-empty members.")
    if not np.all(np.isfinite(values)) or np.any(values < 0) or np.any(values > 1):
        raise ValueError("Satisfaction values must be finite and in [0, 1].")
    if strategy not in STRATEGIES:
        raise ValueError(f"Unknown aggregation strategy: {strategy}")
    weights = np.ones(values.shape[1], dtype=np.float64) if member_weights is None else np.asarray(member_weights, dtype=np.float64)
    if weights.shape != (values.shape[1],) or np.any(weights <= 0) or not np.all(np.isfinite(weights)):
        raise ValueError("Member weights must be positive and match group size.")
    weights = weights / weights.sum()

    if strategy == "average":
        result = values @ weights
    elif strategy == "least_misery":
        result = values.min(axis=1)
    elif strategy == "most_pleasure":
        top_count = max(1, int(np.ceil(values.shape[1] * config.MOST_PLEASURE_TOP_FRACTION)))
        result = np.partition(values, values.shape[1] - top_count, axis=1)[:, -top_count:].mean(axis=1)
    elif strategy == "multiplicative":
        result = np.exp(np.log(np.maximum(values, 1e-12)) @ weights)
    elif strategy == "borda":
        member_ranks = np.column_stack([rankdata(values[:, column], method="average") for column in range(values.shape[1])])
        normalized = (member_ranks - 1) / max(1, values.shape[0] - 1)
        result = normalized @ weights
    elif strategy == "approval":
        result = (values >= approval_threshold).astype(np.float64) @ weights
    else:
        approved = values >= misery_threshold
        result = (values * approved) @ weights
    return np.clip(np.asarray(result, dtype=np.float64), 0.0, 1.0)


def rank_group_candidates(
    satisfaction_matrix: Sequence[Sequence[float]],
    strategy: str,
    *,
    member_weights: Sequence[float] | None = None,
    approval_threshold: float = config.APPROVAL_THRESHOLD,
    misery_threshold: float = config.MISERY_THRESHOLD,
) -> list[GroupRanking]:
    """Aggregate candidates and retain per-member plus unweighted group statistics."""
    values = np.asarray(satisfaction_matrix, dtype=np.float64)
    scores = aggregate_scores(values, strategy, member_weights=member_weights, approval_threshold=approval_threshold, misery_threshold=misery_threshold)
    order = np.argsort(-scores, kind="stable")
    return [GroupRanking(int(index), float(scores[index]), float(values[index].mean()), float(values[index].min()), float(values[index].std()), tuple(float(value) for value in values[index])) for index in order]


def mmr_rerank(
    rankings: Sequence[GroupRanking],
    event_type_ids: Sequence[str],
    *,
    top_n: int,
    recent_event_types: Sequence[str] = (),
    relevance_weight: float = config.MMR_RELEVANCE_WEIGHT,
) -> list[GroupRanking]:
    """Select top candidates with maximal relevance minus repeat-type similarity.

    Similarity is one when candidate event type repeats any recent or already
    selected type, and zero otherwise. Stable input order breaks equal MMR ties.
    """
    if top_n < 1 or len(event_type_ids) != len(rankings):
        raise ValueError("top_n and event type ids must match the ranking list.")
    if not 0.0 <= relevance_weight <= 1.0:
        raise ValueError("MMR relevance weight must be in [0, 1].")
    remaining = list(rankings)
    selected: list[GroupRanking] = []
    used_types = set(recent_event_types)
    while remaining and len(selected) < top_n:
        best_position = 0
        best_value = float("-inf")
        for position, ranking in enumerate(remaining):
            event_type_id = event_type_ids[ranking.candidate_index]
            similarity = 1.0 if event_type_id in used_types else 0.0
            value = relevance_weight * ranking.strategy_score - (1.0 - relevance_weight) * similarity
            if value > best_value:
                best_value = value
                best_position = position
        chosen = remaining.pop(best_position)
        selected.append(chosen)
        used_types.add(event_type_ids[chosen.candidate_index])
    return selected
