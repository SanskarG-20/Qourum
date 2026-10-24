"""Deterministic event-slot enumeration and group feasibility assessment."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from math import ceil
from typing import Mapping, Sequence

from . import config


@dataclass(frozen=True, order=True)
class Candidate:
    """An event type, local start timestamp, duration, and proposed venue."""

    event_type_id: str
    start: datetime
    duration_minutes: int
    venue: str

    @property
    def end(self) -> datetime:
        return self.start + timedelta(minutes=self.duration_minutes)


@dataclass(frozen=True)
class ScheduledBlock:
    """An existing event interval relevant to candidate feasibility."""

    start: datetime
    duration_minutes: int
    venue: str
    status: str = "scheduled"

    @property
    def end(self) -> datetime:
        return self.start + timedelta(minutes=self.duration_minutes)


@dataclass(frozen=True)
class CalendarBlock:
    """A date interval and period kind from the club academic calendar."""

    start_date: date
    end_date: date
    period_type: str


@dataclass(frozen=True)
class CandidateAssessment:
    """Feasibility, quorum evidence, and machine-readable failure reasons."""

    candidate: Candidate
    availability_fraction: float
    expected_attendance: float
    quorum_required: int
    quorum_met: bool
    feasible: bool
    reason_codes: tuple[str, ...]
    available_members: tuple[str, ...]


def generate_candidates(
    event_types: Sequence[tuple[str, int]],
    *,
    start_date: date,
    horizon_days: int = config.CANDIDATE_HORIZON_DAYS,
    opening_hour: int = 9,
    closing_hour: int = 21,
    venues: Sequence[str] = ("Club Room",),
) -> list[Candidate]:
    """Enumerate each event type, date, whole-hour start, and venue in stable order."""
    if horizon_days < 1 or not 0 <= opening_hour < closing_hour <= 24:
        raise ValueError("Candidate horizon or club hours are invalid.")
    if not venues or any(not venue.strip() for venue in venues):
        raise ValueError("At least one non-empty venue is required.")
    if any(duration <= 0 for _, duration in event_types):
        raise ValueError("Event durations must be positive.")
    candidates: list[Candidate] = []
    for day_offset in range(horizon_days):
        event_date = start_date + timedelta(days=day_offset)
        for hour in range(opening_hour, closing_hour, config.CANDIDATE_SLOT_STEP_HOURS):
            for event_type_id, duration in sorted(event_types):
                if hour * 60 + duration > closing_hour * 60:
                    continue
                for venue in sorted(venues):
                    candidates.append(Candidate(event_type_id, datetime.combine(event_date, time(hour)), duration, venue))
    return sorted(candidates)


def assess_candidate(
    candidate: Candidate,
    member_scores: Mapping[str, float],
    weekly_availability: Mapping[str, Sequence[tuple[int, time, time]]],
    *,
    existing_events: Sequence[ScheduledBlock] = (),
    calendar_blocks: Sequence[CalendarBlock] = (),
    latest_start_times: Mapping[str, time | None] | None = None,
    quorum: int | None = None,
    quorum_fraction: float = config.DEFAULT_QUORUM_FRACTION,
    quorum_minimum: int = config.DEFAULT_QUORUM_MINIMUM,
) -> CandidateAssessment:
    """Check conflicts, blocks, dealbreakers, availability, and expected quorum.

    A member is considered available when one normalized weekly window on the
    candidate weekday fully contains the candidate event and the event does not
    start after their latest-start dealbreaker. A dealbreaker removes only that
    member from the available set; it makes the slot infeasible, with the
    `dealbreaker_latest_start` reason, only when the remaining members cannot
    meet quorum. Expected attendance is the sum of individual event-slot scores
    among available members. All independent failure causes are retained in
    deterministic reason-code order.
    """
    if not member_scores:
        raise ValueError("At least one club member is required.")
    if any(not 0.0 <= score <= 1.0 for score in member_scores.values()):
        raise ValueError("Member attend probabilities must be in [0, 1].")
    if not 0.0 <= quorum_fraction <= 1.0 or quorum_minimum < 1:
        raise ValueError("Quorum parameters are invalid.")

    start, end = candidate.start, candidate.end
    reason_codes: list[str] = []
    active = [event for event in existing_events if event.status in {"proposed", "scheduled"}]
    if any(event.venue == candidate.venue and start < event.end and event.start < end for event in active):
        reason_codes.append("venue_conflict")
    if any(event.start.date() == start.date() and start < event.end and event.start < end for event in active):
        reason_codes.append("existing_event_conflict")
    matching_periods = [period for period in calendar_blocks if period.start_date <= start.date() <= period.end_date]
    if any(period.period_type == "holiday" for period in matching_periods):
        reason_codes.append("holiday")
    if any(period.period_type == "exam_week" for period in matching_periods):
        reason_codes.append("exam_week")

    available: list[str] = []
    latest = latest_start_times or {}
    dealbreaker_members: list[str] = []
    for member_id in sorted(member_scores):
        deadline = latest.get(member_id)
        if deadline is not None and start.time() > deadline:
            dealbreaker_members.append(member_id)
            continue
        if any(day == start.weekday() and window_start <= start.time() and window_end >= end.time() for day, window_start, window_end in weekly_availability.get(member_id, ())):
            available.append(member_id)
    fraction = len(available) / len(member_scores)
    expected = sum(member_scores[member_id] for member_id in available)
    required = quorum if quorum is not None else max(quorum_minimum, ceil(quorum_fraction * len(member_scores)))
    if required < 1:
        raise ValueError("Quorum must be at least one.")
    quorum_met = expected >= required
    if not available:
        reason_codes.append("no_available_members")
    if not quorum_met:
        if dealbreaker_members:
            reason_codes.append("dealbreaker_latest_start")
        reason_codes.append("quorum_not_met")
    return CandidateAssessment(
        candidate=candidate,
        availability_fraction=fraction,
        expected_attendance=float(expected),
        quorum_required=required,
        quorum_met=quorum_met,
        feasible=not reason_codes,
        reason_codes=tuple(reason_codes),
        available_members=tuple(available),
    )
