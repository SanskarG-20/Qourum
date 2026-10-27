"""Tests for plan caching and objective-front selection."""

from datetime import date, datetime, time

from backend.planning.models import AvailabilityWindow, PlanFormat, PlanMember
from backend.planning.pareto import pareto_front_ids
from backend.planning.plan_cache import PlanResultCache, settings_hash


def test_pareto_front_keeps_only_undominated_points_and_keeps_ties():
    points = [
        {"id": "balanced", "expected_turnout": 10, "least_happy_satisfaction": .7},
        {"id": "high-turnout", "expected_turnout": 14, "least_happy_satisfaction": .55},
        {"id": "high-satisfaction", "expected_turnout": 8, "least_happy_satisfaction": .9},
        {"id": "dominated", "expected_turnout": 7, "least_happy_satisfaction": .5},
        {"id": "same-as-balanced", "expected_turnout": 10, "least_happy_satisfaction": .7},
    ]
    assert set(pareto_front_ids(points)) == {
        "balanced", "high-turnout", "high-satisfaction", "same-as-balanced",
    }


def test_plan_cache_is_bounded_and_returns_isolated_results():
    cache = PlanResultCache(max_entries=2)
    calls = []

    def build():
        calls.append("built")
        return {"results": [1, 2]}

    first, hit = cache.get_or_build("a", build)
    assert hit is False
    first["results"].append(3)
    second, hit = cache.get_or_build("a", build)
    assert hit is True
    assert second == {"results": [1, 2]}
    cache.get_or_build("b", build)
    cache.get_or_build("c", build)
    assert cache.get_or_build("a", build)[1] is False
    assert len(calls) == 4


def test_settings_hash_is_deterministic_and_tracks_club_data_changes():
    member = PlanMember("m1", 500, "either", (
        AvailabilityWindow(weekday=1, start=time(9), end=time(12), is_available=True),
    ))
    event_format = PlanFormat("f1", "Workshop", "t1", "learning", "beginner", 60, 0,
                              ("in_person",), 1, 40)
    args = {
        "club_id": "club-1", "settings": {"start_date": "2026-11-01", "seed": 42},
        "members": [member], "formats": [event_format], "observations": [],
        "explicit_preferences": {("m1", "f1"): .8},
        "calendar_flags": {date(2026, 11, 1): ("exam_week",)},
        "existing_events": [(datetime(2026, 11, 2, 9), datetime(2026, 11, 2, 10))],
    }
    first = settings_hash(**args)
    assert first == settings_hash(**args)
    assert first != settings_hash(**{**args, "settings": {**args["settings"], "seed": 43}})
    changed_member = PlanMember("m1", 250, "either", member.availability)
    assert first != settings_hash(**{**args, "members": [changed_member]})
