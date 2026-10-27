"""Item-mean and category/skill content affinity for member-format pairs."""

from __future__ import annotations

from collections import defaultdict
from typing import Mapping, Sequence

import numpy as np

from . import config
from .models import AffinityEstimate, PlanFormat, PlanObservation

SKILL_ORDER = {"beginner": 0, "intermediate": 1, "advanced": 2}


def _observation_value(observation: PlanObservation) -> float:
    if observation.rating is not None:
        return (observation.rating - 1) / 4
    return 1.0 if observation.attended else 0.35


def confidence_label(observation_count: int) -> str:
    return "low" if observation_count < config.COLD_START_INTERACTION_THRESHOLD else "medium" if observation_count < config.HIGH_CONFIDENCE_INTERACTION_THRESHOLD else "high"


def build_format_affinities(
    member_ids: Sequence[str],
    formats: Sequence[PlanFormat],
    observations: Sequence[PlanObservation],
    explicit_preferences: Mapping[tuple[str, str], float] | None = None,
) -> dict[tuple[str, str], AffinityEstimate]:
    """Estimate format preference from direct outcomes and related category/skill history.

    Direct item means are shrunk toward a content-based estimate from related
    formats. Same-category relatedness decreases by a configured amount per
    skill-level step; other categories retain a cross-category prior.
    Explicit 1–5 preferences are blended as one additional direct observation.
    """
    by_member: dict[str, list[PlanObservation]] = defaultdict(list)
    by_pair: dict[tuple[str, str], list[PlanObservation]] = defaultdict(list)
    for item in observations:
        by_member[item.member_id].append(item)
        by_pair[(item.member_id, item.format_id)].append(item)
    all_values = [_observation_value(item) for item in observations]
    club_mean = float(np.mean(all_values)) if all_values else 0.5
    format_by_id = {item.format_id: item for item in formats}
    preferences = explicit_preferences or {}
    estimates: dict[tuple[str, str], AffinityEstimate] = {}

    for member_id in member_ids:
        history_count = len(by_member.get(member_id, ()))
        for event_format in formats:
            direct = by_pair.get((member_id, event_format.format_id), ())
            direct_values = [_observation_value(item) for item in direct]
            related_values: list[float] = []
            related_weights: list[float] = []
            for item in by_member.get(member_id, ()):
                if item.format_id == event_format.format_id:
                    continue
                other = format_by_id.get(item.format_id)
                if other is None:
                    continue
                category_similarity = 1.0 if other.category == event_format.category else config.AFFINITY_CROSS_CATEGORY_WEIGHT
                level_distance = abs(SKILL_ORDER[other.skill_level] - SKILL_ORDER[event_format.skill_level])
                weight = category_similarity * max(config.AFFINITY_CROSS_CATEGORY_WEIGHT,
                                                    1.0 - config.AFFINITY_SKILL_STEP_WEIGHT * level_distance)
                related_values.append(_observation_value(item))
                related_weights.append(weight)
            related_mean = (
                float(np.average(related_values, weights=related_weights))
                if related_values else club_mean
            )
            explicit = preferences.get((member_id, event_format.format_id))
            if explicit is not None and not 0 <= explicit <= 1:
                raise ValueError("Explicit preference affinity must be in [0, 1]")
            direct_values = list(direct_values)
            if explicit is not None:
                direct_values.append(float(explicit))
            probability = (
                (sum(direct_values) + related_mean * config.AFFINITY_DIRECT_PRIOR_COUNT)
                / (len(direct_values) + config.AFFINITY_DIRECT_PRIOR_COUNT)
                if direct_values else related_mean
            )
            support = len(direct_values) + len(related_values)
            is_cold_start = history_count < config.COLD_START_INTERACTION_THRESHOLD
            estimates[(member_id, event_format.format_id)] = AffinityEstimate(
                probability=float(np.clip(probability, 0.0, 1.0)),
                evidence_count=int(support),
                is_cold_start=is_cold_start,
                confidence=confidence_label(history_count + (1 if explicit is not None else 0)),
            )
    return estimates

