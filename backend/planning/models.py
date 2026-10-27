"""Typed inputs and outputs for the pure planning engine."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Mapping

from .config import TIME_BLOCK_STARTS

TIME_BLOCKS = tuple(TIME_BLOCK_STARTS)


@dataclass(frozen=True)
class PlanFormat:
    format_id: str
    name: str
    event_type_id: str
    category: str
    skill_level: str
    duration_minutes: int
    fee_inr: int
    modes: tuple[str, ...]
    min_capacity: int
    max_capacity: int


@dataclass(frozen=True)
class AvailabilityWindow:
    weekday: int | None
    start: time
    end: time
    is_available: bool
    specific_date: date | None = None


@dataclass(frozen=True)
class PlanMember:
    member_id: str
    max_fee_inr: int | None
    mode_preference: str
    availability: tuple[AvailabilityWindow, ...] = ()
    latest_start_time: time | None = None
    recent_dissatisfaction: float = 0.0


@dataclass(frozen=True)
class PlanCandidate:
    format_id: str
    event_type_id: str
    event_date: date
    time_block: str
    start: datetime
    mode: str
    fee_inr: int
    capacity: int
    min_capacity: int
    category: str
    skill_level: str
    duration_minutes: int

    @property
    def end(self) -> datetime:
        return self.start + timedelta(minutes=self.duration_minutes)


@dataclass(frozen=True)
class CandidateAssessment:
    candidate: PlanCandidate
    accepted: bool
    reason_codes: tuple[str, ...]
    available_member_ids: tuple[str, ...]
    unavailable_members: Mapping[str, tuple[str, ...]]
    unavailable_reason_counts: Mapping[str, int]


@dataclass(frozen=True)
class PlanObservation:
    member_id: str
    format_id: str
    time_block: str
    fee_inr: int
    mode: str
    attended: bool
    rating: int | None = None
    timestamp: datetime | None = None


@dataclass(frozen=True)
class AffinityEstimate:
    probability: float
    evidence_count: int
    is_cold_start: bool
    confidence: str
