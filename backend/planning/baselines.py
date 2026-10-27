"""Seeded and history-based attendance baselines."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Sequence

import numpy as np

from . import config
from .models import PlanCandidate, PlanObservation


def random_baseline(member_ids: Sequence[str], candidates: Sequence[PlanCandidate], *, seed: int) -> np.ndarray:
    """Return reproducible random member-candidate probabilities in [0,1]."""
    return np.random.default_rng(seed).random((len(candidates), len(member_ids)))


def popularity_baseline(
    member_ids: Sequence[str], candidates: Sequence[PlanCandidate], observations: Sequence[PlanObservation]
) -> np.ndarray:
    """Use smoothed historical attendance rate for each candidate format."""
    labels = [float(item.attended) for item in observations]
    club_mean = (sum(labels) + config.BASELINE_PRIOR_COUNT * config.BASELINE_PRIOR_PROBABILITY) / (len(labels) + config.BASELINE_PRIOR_COUNT)
    counts: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    for observation in observations:
        counts[observation.format_id][0] += int(observation.attended)
        counts[observation.format_id][1] += 1
    rates = {
        format_id: (attended + config.BASELINE_PRIOR_COUNT * club_mean) / (total + config.BASELINE_PRIOR_COUNT)
        for format_id, (attended, total) in counts.items()
    }
    return np.array([[rates.get(candidate.format_id, club_mean)] * len(member_ids) for candidate in candidates], dtype=np.float64)


def repeat_last_baseline(
    member_ids: Sequence[str], candidates: Sequence[PlanCandidate], observations: Sequence[PlanObservation]
) -> np.ndarray:
    """Favor each member's most recent format, shrunk toward club attendance rate."""
    labels = [float(item.attended) for item in observations]
    club_mean = (sum(labels) + config.BASELINE_PRIOR_COUNT * config.BASELINE_PRIOR_PROBABILITY) / (len(labels) + config.BASELINE_PRIOR_COUNT)
    latest: dict[str, PlanObservation] = {}
    for item in observations:
        current = latest.get(item.member_id)
        if current is None or item.timestamp is None and current.timestamp is None or (item.timestamp or datetime.min) >= (current.timestamp or datetime.min):
            latest[item.member_id] = item
    values = np.full((len(candidates), len(member_ids)), club_mean, dtype=np.float64)
    for candidate_index, candidate in enumerate(candidates):
        for member_index, member_id in enumerate(member_ids):
            last = latest.get(member_id)
            if last is not None and last.format_id == candidate.format_id:
                last_outcome = float(last.rating / config.RATING_SCALE_MAX if last.rating is not None else last.attended)
                values[candidate_index, member_index] = (
                    config.REPEAT_LAST_BLEND * last_outcome + (1 - config.REPEAT_LAST_BLEND) * club_mean
                )
    return np.clip(values, 0.0, 1.0)

