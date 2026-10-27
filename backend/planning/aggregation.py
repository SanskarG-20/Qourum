"""Interchangeable group aggregation functions for per-member satisfaction."""

from __future__ import annotations

from typing import Mapping, Sequence

import numpy as np

from . import config

STRATEGIES = ("average", "least_misery", "fairness_aware")


def aggregate_candidate(
    member_scores: Mapping[str, float],
    strategy: str,
    recent_dissatisfaction: Mapping[str, float] | None = None,
) -> tuple[float, dict[str, float]]:
    """Return a [0,1] group score and the satisfaction summary for available members."""
    if strategy not in STRATEGIES:
        raise ValueError(f"Unknown group strategy: {strategy}")
    if not member_scores:
        raise ValueError("Cannot aggregate an empty available group")
    ids = list(member_scores)
    values = np.asarray([member_scores[item] for item in ids], dtype=np.float64)
    if not np.all(np.isfinite(values)) or np.any(values < 0) or np.any(values > 1):
        raise ValueError("Member satisfaction must be finite and in [0, 1]")
    if strategy == "least_misery":
        group_score = float(values.min())
    elif strategy == "fairness_aware":
        dissatisfaction = recent_dissatisfaction or {}
        weights = np.asarray([
            1 + config.FAIRNESS_MAX_DISSATISFACTION_BOOST * float(dissatisfaction.get(item, 0.0))
            for item in ids
        ], dtype=np.float64)
        if not np.all(np.isfinite(weights)) or np.any(weights < 1) or np.any(weights > 1 + config.FAIRNESS_MAX_DISSATISFACTION_BOOST):
            raise ValueError("Recent dissatisfaction must be in [0, 1]")
        group_score = float(np.average(values, weights=weights))
    else:
        group_score = float(values.mean())
    summary = {
        "mean": float(values.mean()), "minimum": float(values.min()),
        "standard_deviation": float(values.std()),
    }
    return float(np.clip(group_score, 0.0, 1.0)), summary

