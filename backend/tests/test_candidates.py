"""Candidate enumeration and each feasibility reason code are deterministic."""

from datetime import date, datetime, time, timedelta

import pytest

from backend.recsys.candidates import CalendarBlock, Candidate, ScheduledBlock, assess_candidate, generate_candidates


START = datetime(2026, 10, 26, 18, 0)  # Monday
SLOT = Candidate("talk", START, 60, "Room A")
MEMBERS = {"m1": 0.9, "m2": 0.9}
AVAILABLE = {member: [(0, time(17), time(20))] for member in MEMBERS}


def test_candidate_generation_respects_horizon_hours_duration_and_order():
    result = generate_candidates([("talk", 60), ("workshop", 120)], start_date=date(2026, 10, 26), horizon_days=2, opening_hour=18, closing_hour=21, venues=("Room B", "Room A"))
    assert result == sorted(result)
    assert len(result) == 2 * 10
    assert all(item.start.hour < 21 and item.end.hour <= 21 for item in result)


@pytest.mark.parametrize("reason,kwargs", [
    ("venue_conflict", {"existing_events": [ScheduledBlock(START, 60, "Room A")]}),
    ("existing_event_conflict", {"existing_events": [ScheduledBlock(START, 60, "Room B")]}),
    ("holiday", {"calendar_blocks": [CalendarBlock(START.date(), START.date(), "holiday")]}),
    ("exam_week", {"calendar_blocks": [CalendarBlock(START.date(), START.date(), "exam_week")]}),
    ("dealbreaker_latest_start", {"latest_start_times": {"m1": time(17), "m2": time(17)}}),
    ("no_available_members", {"weekly_availability": {}}),
    ("quorum_not_met", {"member_scores": {"m1": 0.1, "m2": 0.1}}),
])
def test_each_failure_reason_code_is_reported(reason, kwargs):
    parameters = {"member_scores": MEMBERS, "weekly_availability": AVAILABLE, "quorum": 2}
    parameters.update(kwargs)
    assessment = assess_candidate(SLOT, **parameters)
    assert reason in assessment.reason_codes
    assert not assessment.feasible


def test_candidate_assessment_returns_attendance_and_quorum_evidence():
    result = assess_candidate(SLOT, MEMBERS, AVAILABLE, quorum=1)
    assert result.feasible
    assert result.availability_fraction == 1.0
    assert result.expected_attendance == 1.8
    assert result.quorum_met
    assert result.reason_codes == ()


def test_one_members_dealbreaker_excludes_only_that_member():
    members = {"m1": 0.9, "m2": 0.9, "m3": 0.9}
    availability = {member: [(0, time(17), time(20))] for member in members}
    result = assess_candidate(SLOT, members, availability, latest_start_times={"m1": time(17)}, quorum=1)
    assert result.feasible
    assert result.available_members == ("m2", "m3")
    assert "dealbreaker_latest_start" not in result.reason_codes


def test_dealbreaker_reason_is_reported_when_it_causes_quorum_failure():
    members = {"m1": 0.9, "m2": 0.9, "m3": 0.9}
    availability = {member: [(0, time(17), time(20))] for member in members}
    result = assess_candidate(SLOT, members, availability, latest_start_times={"m1": time(17), "m2": time(17)}, quorum=2)
    assert not result.feasible
    assert result.reason_codes == ("dealbreaker_latest_start", "quorum_not_met")
