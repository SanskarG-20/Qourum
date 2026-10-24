"""Pure NumPy hybrid member scoring with deterministic evidence breakdowns."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Mapping, Sequence

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
class ContentSignal:
    """Candidate-description similarity and number of attended texts in a profile."""

    similarity: float
    observation_count: int


@dataclass(frozen=True)
class MemberScore:
    """Bounded member score and transparent component/confidence values."""

    score: float
    explicit_rating: float | None
    implicit_attendance: float | None
    time_affinity: float | None
    content_similarity: float | None
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
    content_evidence: Mapping[str, ContentSignal] | None = None,
    content_enabled: bool = True,
) -> list[MemberScore]:
    """Score members in [0,1] from explicit, recency-weighted, and time evidence.

    An explicit 1-5 rating maps linearly to [0,1]. Implicit events receive
    outcome values (attended=1, yes/no-show=0.35, ignored=0), multiplied by
    exp(-ln(2) * age_days / half_life). Time affinity is the Laplace-smoothed
    attendance rate for the candidate weekday/hour. Each component's base
    weight is multiplied by n/(n+prior), then normalized; no evidence uses the
    supplied club-popularity fallback and marks the result as cold start. Content
    similarity is mapped to [0,1], weighted by n/(n+content_prior), and included
    only when a member has at least one prior attended-event description.
    """
    if not 0 <= day_of_week <= 6 or not 0 <= hour <= 23:
        raise ValueError("Candidate day and hour must be within calendar bounds.")
    if not 0.0 <= popularity_fallback <= 1.0:
        raise ValueError("Popularity fallback must be in [0, 1].")

    count = len(member_ids)
    nan = float("nan")
    explicit = [nan] * count
    implicit = [nan] * count
    time_affinity = [nan] * count
    content = [nan] * count
    confidence_explicit = [0.0] * count
    confidence_implicit = [0.0] * count
    confidence_time = [0.0] * count
    confidence_content = [0.0] * count
    decay_rate = np.log(2.0)

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
            recency = np.exp(-decay_rate * ages / config.ATTENDANCE_HALF_LIFE_DAYS) if recency_decay else np.ones_like(ages)
            # Same arithmetic as np.average(values, weights=recency), without its per-call overhead.
            total_recency = recency.sum()
            if total_recency == 0:
                raise ZeroDivisionError("Weights sum to zero, can't be normalized")
            implicit[index] = float((values * recency).sum() / total_recency)
            confidence_implicit[index] = len(matching) / (len(matching) + config.IMPLICIT_CONFIDENCE_PRIOR)

        slots = time_history.get(member_id, ()) if time_affinity_enabled else ()
        matching_slots = [row for row in slots if row.day_of_week == day_of_week and row.hour == hour]
        if slots:
            successes = sum(row.attended for row in matching_slots)
            time_affinity[index] = (successes + config.TIME_LAPLACE_ALPHA) / (len(matching_slots) + 2 * config.TIME_LAPLACE_ALPHA)
            confidence_time[index] = len(slots) / (len(slots) + config.TIME_CONFIDENCE_PRIOR)

        signal = (content_evidence or {}).get(member_id) if content_enabled else None
        if signal is not None:
            if not 0.0 <= signal.similarity <= 1.0 or signal.observation_count < 1:
                raise ValueError("Content evidence must have bounded similarity and a positive observation count.")
            content[index] = signal.similarity
            confidence_content[index] = signal.observation_count / (signal.observation_count + config.CONTENT_CONFIDENCE_PRIOR)

    components = (
        ("explicit", explicit, confidence_explicit, config.EXPLICIT_BASE_WEIGHT),
        ("implicit", implicit, confidence_implicit, config.IMPLICIT_BASE_WEIGHT),
        ("time", time_affinity, confidence_time, config.TIME_BASE_WEIGHT),
        ("content", content, confidence_content, config.CONTENT_BASE_WEIGHT),
    )
    result: list[MemberScore] = []
    for index in range(count):
        available: list[tuple[str, float, float]] = []
        for name, values, confidence, base in components:
            if values[index] == values[index]:  # not NaN
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
            score=float(min(1.0, max(0.0, score))),
            explicit_rating=None if explicit[index] != explicit[index] else float(explicit[index]),
            implicit_attendance=None if implicit[index] != implicit[index] else float(implicit[index]),
            time_affinity=None if time_affinity[index] != time_affinity[index] else float(time_affinity[index]),
            content_similarity=None if content[index] != content[index] else float(content[index]),
            confidence={"explicit": float(confidence_explicit[index]), "implicit": float(confidence_implicit[index]), "time": float(confidence_time[index]), "content": float(confidence_content[index])},
            component_weights=weights,
            is_cold_start=is_cold_start,
        ))
    return result


def club_attendance_fallback(
    outcomes_by_type: Mapping[str, tuple[int, int]], event_type_id: str,
) -> float:
    """Return the club's smoothed attendance rate for an event type, in [0, 1].

    `outcomes_by_type` maps event type to (attended, observed) member outcomes
    before the scoring cutoff. The type's rate is shrunk toward the club-wide
    rate with a pseudo-count prior, so sparse types stay near the club average;
    with no club history at all the neutral default rate is returned. Unlike a
    share of past events, this is an attendance probability and sits on the
    same scale as the other member scores.
    """
    total_attended = sum(attended for attended, _ in outcomes_by_type.values())
    total_observed = sum(observed for _, observed in outcomes_by_type.values())
    if total_observed == 0:
        return config.COLD_START_DEFAULT_RATE
    club_rate = total_attended / total_observed
    attended, observed = outcomes_by_type.get(event_type_id, (0, 0))
    prior = config.COLD_START_RATE_PRIOR
    return float(np.clip((attended + prior * club_rate) / (observed + prior), 0.0, 1.0))
