"""Candidate enumeration and hard rejection filters with reason evidence."""

from __future__ import annotations

from datetime import date, datetime
from typing import Mapping, Sequence

from . import config
from .models import AvailabilityWindow, CandidateAssessment, PlanCandidate, PlanFormat, PlanMember, TIME_BLOCKS, TIME_BLOCK_STARTS


def generate_candidates(formats: Sequence[PlanFormat], start_date: date, horizon_days: int) -> list[PlanCandidate]:
    """Enumerate format × date × time block × supported mode candidates."""
    if not 1 <= horizon_days <= config.MAX_HORIZON_DAYS:
        raise ValueError(f"horizon_days must be between 1 and {config.MAX_HORIZON_DAYS}")
    candidates = []
    for day_offset in range(horizon_days):
        event_date = start_date.fromordinal(start_date.toordinal() + day_offset)
        for event_format in sorted(formats, key=lambda item: item.format_id):
            if event_format.duration_minutes < 1 or event_format.min_capacity < 1 or event_format.max_capacity < event_format.min_capacity:
                raise ValueError(f"Invalid duration or capacity for format {event_format.format_id}")
            for block in TIME_BLOCKS:
                start = datetime.combine(event_date, TIME_BLOCK_STARTS[block])
                for mode in sorted(event_format.modes):
                    candidates.append(PlanCandidate(
                        format_id=event_format.format_id,
                        event_type_id=event_format.event_type_id,
                        event_date=event_date,
                        time_block=block,
                        start=start,
                        mode=mode,
                        fee_inr=event_format.fee_inr,
                        capacity=event_format.max_capacity,
                        min_capacity=event_format.min_capacity,
                        category=event_format.category,
                        skill_level=event_format.skill_level,
                        duration_minutes=event_format.duration_minutes,
                    ))
    return candidates


def _window_match(candidate: PlanCandidate, window: AvailabilityWindow) -> bool:
    return window.start <= candidate.start.time() and window.end >= candidate.end.time()


def build_availability_index(members: Sequence[PlanMember]):
    """Index weekly and date-specific availability once for a whole plan run."""
    result = {}
    for member in members:
        weekly: dict[int, list[AvailabilityWindow]] = {}
        overrides: dict[date, list[AvailabilityWindow]] = {}
        for window in member.availability:
            if window.specific_date is not None:
                overrides.setdefault(window.specific_date, []).append(window)
            elif window.weekday is not None:
                weekly.setdefault(window.weekday, []).append(window)
        result[member.member_id] = (weekly, overrides)
    return result


def _member_available(member: PlanMember, candidate: PlanCandidate, availability_index=None) -> bool:
    if availability_index is None:
        windows = member.availability
        overrides = [window for window in windows if window.specific_date == candidate.event_date
                     and window.start < candidate.end.time() and candidate.start.time() < window.end]
        weekly = [window for window in windows if window.specific_date is None
                  and window.weekday == candidate.event_date.weekday()]
    else:
        weekly_by_day, overrides_by_date = availability_index[member.member_id]
        overrides = [window for window in overrides_by_date.get(candidate.event_date, ())
                     if window.start < candidate.end.time() and candidate.start.time() < window.end]
        weekly = weekly_by_day.get(candidate.event_date.weekday(), ())
    if overrides:
        return any(window.is_available and _window_match(candidate, window) for window in overrides)
    return any(window.is_available and _window_match(candidate, window) for window in weekly)


def member_unavailability_reasons(member: PlanMember, candidate: PlanCandidate, availability_index=None) -> tuple[str, ...]:
    """Return every member-specific hard-filter reason for one candidate."""
    reasons = []
    if member.max_fee_inr is not None and candidate.fee_inr > member.max_fee_inr:
        reasons.append("fee_above_member_max")
    if member.mode_preference not in ("either", candidate.mode):
        reasons.append("mode_mismatch")
    if member.latest_start_time is not None and candidate.start.time() > member.latest_start_time:
        reasons.append("latest_start_time")
    if not _member_available(member, candidate, availability_index):
        reasons.append("not_available")
    return tuple(reasons)


def assess_candidate(
    candidate: PlanCandidate,
    members: Sequence[PlanMember],
    calendar_flags: Mapping[date, Sequence[str]],
    *,
    min_people_available: int,
    availability_index=None,
    schedule_cache: dict | None = None,
    eligibility_cache: dict | None = None,
    include_member_details: bool = True,
    selected_format_ids: Sequence[str] | None = None,
    fee_policy: str = "any",
    fee_cap_inr: int | None = None,
    delivery_mode: str = "any",
    existing_events: Sequence[tuple[datetime, datetime]] = (),
) -> CandidateAssessment:
    """Apply global dates, per-member fee/mode/availability, and capacity filters."""
    if not members:
        raise ValueError("A plan requires at least one club member")
    if not 1 <= min_people_available <= len(members):
        raise ValueError("min_people_available must be between one and club size")

    reasons: list[str] = []
    if any(start < candidate.end and candidate.start < end for start, end in existing_events):
        reasons.append("existing_event_conflict")
    if selected_format_ids and candidate.format_id not in selected_format_ids:
        reasons.append("format_not_selected")
    if fee_policy == "free" and candidate.fee_inr != 0:
        reasons.append("paid_format_excluded")
    if fee_policy == "paid" and candidate.fee_inr <= 0:
        reasons.append("free_format_excluded")
    if fee_cap_inr is not None and candidate.fee_inr > fee_cap_inr:
        reasons.append("fee_above_club_cap")
    if delivery_mode != "any" and candidate.mode != delivery_mode:
        reasons.append("delivery_mode_excluded")
    flags = set(calendar_flags.get(candidate.event_date, ()))
    if "exam_week" in flags:
        reasons.append("exam_week")
    if "holiday" in flags:
        reasons.append("holiday")

    schedule_key = (candidate.event_date, candidate.time_block, candidate.duration_minutes)
    schedule_available = schedule_cache.get(schedule_key) if schedule_cache is not None else None
    if schedule_available is None:
        schedule_available = frozenset(
            member.member_id for member in members if _member_available(member, candidate, availability_index)
        )
        if schedule_cache is not None:
            schedule_cache[schedule_key] = schedule_available

    eligibility_key = (candidate.fee_inr, candidate.mode, candidate.start.time())
    eligibility = eligibility_cache.get(eligibility_key) if eligibility_cache is not None else None
    if eligibility is None:
        fee_excluded = frozenset(member.member_id for member in members
                                 if member.max_fee_inr is not None and candidate.fee_inr > member.max_fee_inr)
        mode_excluded = frozenset(member.member_id for member in members
                                  if member.mode_preference not in ("either", candidate.mode))
        time_excluded = frozenset(member.member_id for member in members
                                  if member.latest_start_time is not None and candidate.start.time() > member.latest_start_time)
        eligibility = (fee_excluded, mode_excluded, time_excluded)
        if eligibility_cache is not None:
            eligibility_cache[eligibility_key] = eligibility
    fee_excluded, mode_excluded, time_excluded = eligibility
    excluded = fee_excluded | mode_excluded | time_excluded
    available = sorted(set(schedule_available) - excluded)
    unavailable_counts = {
        "fee_above_member_max": len(fee_excluded),
        "mode_mismatch": len(mode_excluded),
        "latest_start_time": len(time_excluded),
        "not_available": len(members) - len(schedule_available),
    }
    unavailable: dict[str, tuple[str, ...]] = {}
    if include_member_details:
        available_set = set(available)
        unavailable = {
            member.member_id: member_unavailability_reasons(member, candidate, availability_index)
            for member in members if member.member_id not in available_set
        }
        unavailable = {member_id: reasons for member_id, reasons in unavailable.items() if reasons}

    count = len(available)
    if count < min_people_available:
        reasons.append("min_people_available")
    if count < candidate.min_capacity:
        reasons.append("below_format_min_capacity")
    if count > candidate.capacity:
        reasons.append("format_capacity_exceeded")

    if reasons:
        if fee_excluded:
            reasons.append("fee_excludes_members")
        if mode_excluded:
            reasons.append("mode_excludes_members")
    # Preserve deterministic order while avoiding repeated reason codes.
    ordered = tuple(dict.fromkeys(reasons))
    return CandidateAssessment(candidate, not ordered, ordered, tuple(available), unavailable, unavailable_counts)
