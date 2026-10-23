"""Pure NumPy hybrid member scoring with deterministic evidence breakdowns."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Sequence

import numpy as np

from . import config


@dataclass(frozen=True)
class AttendanceObservation:
    """A past event-type interaction and its outcome at a timestamp."""

    event_type_id: str
    status: str
    attended: bool
    timestamp: datetime


@dataclass(frozen=True)
class TimeObservation:
    """A past event slot with the member's observed attendance outcome."""

    day_of_week: int
    hour: int
    attended: bool


@dataclass(frozen=True)
class MemberScore:
    """Bounded member score and transparent component/confidence values."""

    score: float
    explicit_rating: float | None
    implicit_attendance: float | None
    time_affinity: float | None
    confidence: dict[str, float]
    component_weights: dict[str, float]
    is_cold_start: bool


def score_members(
    member_ids: Sequence[str],
    event_type_id: str,
    day_of_week: int,
    hour: int,
    preferences: dict[str, dict[str, int]],
    attendance_history: dict[str, Sequence[AttendanceObservation]],
    time_history: dict[str, Sequence[TimeObservation]],
    *,
    now: datetime,
    popularity_fallback: float = 0.5,
    recency_decay: bool = True,
    time_affinity_enabled: bool = True,
) -> list[MemberScore]:
    """Score members in [0,1] from explicit, recency-weighted, and time evidence.

    An explicit 1-5 rating maps linearly to [0,1]. Implicit events receive
    outcome values (attended=1, yes/no-show=0.35, ignored=0), multiplied by
    exp(-ln(2) * age_days / half_life). Time affinity is the Laplace-smoothed
    attendance rate for the candidate weekday/hour. Each component's base
    weight is multiplied by n/(n+prior), then normalized; no evidence uses the
    supplied club-popularity fallback and marks the result as cold start.
    """
    if not 0 <= day_of_week <= 6 or not 0 <= hour <= 23:
        raise ValueError("Candidate day and hour must be within calendar bounds.")
    if not 0.0 <= popularity_fallback <= 1.0:
        raise ValueError("Popularity fallback must be in [0, 1].")

    count = len(member_ids)
    explicit = np.full(count, np.nan, dtype=np.float64)
    implicit = np.full(count, np.nan, dtype=np.float64)
    time_affinity = np.full(count, np.nan, dtype=np.float64)
    confidence_explicit = np.zeros(count, dtype=np.float64)
    confidence_implicit = np.zeros(count, dtype=np.float64)
    confidence_time = np.zeros(count, dtype=np.float64)

    for index, member_id in enumerate(member_ids):
        rating = preferences.get(member_id, {}).get(event_type_id)
        if rating is not None:
            if not 1 <= rating <= 5:
                raise ValueError("Preference ratings must be integers from 1 to 5.")
            explicit[index] = (rating - 1) / 4.0
            rating_count = len(preferences.get(member_id, {}))
            confidence_explicit[index] = rating_count / (rating_count + config.EXPLICIT_CONFIDENCE_PRIOR)

        observations = attendance_history.get(member_id, ())
        matching = [row for row in observations if row.event_type_id == event_type_id]
        if matching:
            values = np.empty(len(matching), dtype=np.float64)
            ages = np.empty(len(matching), dtype=np.float64)
            for item_index, row in enumerate(matching):
                if row.attended:
                    values[item_index] = config.IMPLICIT_ATTENDED_VALUE
                elif row.status == "yes":
                    values[item_index] = config.IMPLICIT_YES_NO_SHOW_VALUE
                else:
                    values[item_index] = config.IMPLICIT_IGNORED_VALUE
                ages[item_index] = max(0.0, (now - row.timestamp).total_seconds() / 86400.0)
            recency = np.exp(-np.log(2.0) * ages / config.ATTENDANCE_HALF_LIFE_DAYS) if recency_decay else np.ones_like(ages)
            implicit[index] = float(np.average(values, weights=recency))
            confidence_implicit[index] = len(matching) / (len(matching) + config.IMPLICIT_CONFIDENCE_PRIOR)

        slots = time_history.get(member_id, ()) if time_affinity_enabled else ()
        matching_slots = [row for row in slots if row.day_of_week == day_of_week and row.hour == hour]
        if slots:
            successes = sum(row.attended for row in matching_slots)
            time_affinity[index] = (successes + config.TIME_LAPLACE_ALPHA) / (len(matching_slots) + 2 * config.TIME_LAPLACE_ALPHA)
            confidence_time[index] = len(slots) / (len(slots) + config.TIME_CONFIDENCE_PRIOR)

    result: list[MemberScore] = []
    for index in range(count):
        available: list[tuple[str, float, float]] = []
        for name, values, confidence, base in (
            ("explicit", explicit, confidence_explicit, config.EXPLICIT_BASE_WEIGHT),
            ("implicit", implicit, confidence_implicit, config.IMPLICIT_BASE_WEIGHT),
            ("time", time_affinity, confidence_time, config.TIME_BASE_WEIGHT),
        ):
            if not np.isnan(values[index]):
                available.append((name, float(values[index]), float(base * confidence[index])))
        if available and sum(weight for _, _, weight in available) > 0:
            total_weight = sum(weight for _, _, weight in available)
            score = sum(value * weight for _, value, weight in available) / total_weight
            weights = {name: weight / total_weight for name, _, weight in available}
            is_cold_start = False
        else:
            score = popularity_fallback
            weights = {"club_popularity": config.COLD_START_BASE_WEIGHT}
            is_cold_start = True
        result.append(MemberScore(
            score=float(np.clip(score, 0.0, 1.0)),
            explicit_rating=None if np.isnan(explicit[index]) else float(explicit[index]),
            implicit_attendance=None if np.isnan(implicit[index]) else float(implicit[index]),
            time_affinity=None if np.isnan(time_affinity[index]) else float(time_affinity[index]),
            confidence={"explicit": float(confidence_explicit[index]), "implicit": float(confidence_implicit[index]), "time": float(confidence_time[index])},
            component_weights=weights,
            is_cold_start=is_cold_start,
        ))
    return result
