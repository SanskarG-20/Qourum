"""Unit tests for the standalone plan candidate and prediction engine."""

from datetime import date, datetime, time, timedelta
from time import perf_counter

import numpy as np
import pytest

from backend.planning.aggregation import aggregate_candidate
from backend.planning.affinity import build_format_affinities
from backend.planning.attendance_model import LogisticAttendanceModel
from backend.planning.baselines import popularity_baseline, random_baseline, repeat_last_baseline
from backend.planning.candidates import assess_candidate, generate_candidates
from backend.planning.diversity import rerank_diverse
from backend.planning.models import AvailabilityWindow, PlanCandidate, PlanFormat, PlanMember, PlanObservation
from backend.planning.pipeline import build_plan


DAY = date(2026, 11, 2)


def _format(format_id="f1", category="technical", fee=0, duration=60, minimum=1, maximum=100):
    return PlanFormat(format_id, format_id.title(), format_id, category, "beginner", duration, fee,
                      ("in_person", "online"), minimum, maximum)


def _member(member_id, *, fee=1000, mode="either", windows=True, dissatisfaction=0.0):
    availability = tuple(
        AvailabilityWindow(day, time(9), time(23), True)
        for day in range(7)
    ) if windows else ()
    return PlanMember(member_id, fee, mode, availability, recent_dissatisfaction=dissatisfaction)


def test_average_and_least_misery_disagree_on_three_member_toy_group():
    average_a, _ = aggregate_candidate({"a": 0.9, "b": 0.9, "c": 0.1}, "average")
    average_b, _ = aggregate_candidate({"a": 0.5, "b": 0.5, "c": 0.5}, "average")
    misery_a, _ = aggregate_candidate({"a": 0.9, "b": 0.9, "c": 0.1}, "least_misery")
    misery_b, _ = aggregate_candidate({"a": 0.5, "b": 0.5, "c": 0.5}, "least_misery")
    assert average_a > average_b
    assert misery_a < misery_b


def test_fairness_aware_weights_recently_dissatisfied_members():
    scores = {"underserved": 0.2, "other": 0.8}
    average, _ = aggregate_candidate(scores, "average")
    fair, _ = aggregate_candidate(scores, "fairness_aware", {"underserved": 1.0})
    assert fair < average


def test_hard_filter_reasons_cover_fee_mode_availability_dates_and_capacity():
    candidate = PlanCandidate("f1", "event", DAY, "evening", datetime.combine(DAY, time(18)),
                              "in_person", 99, 100, 1, "technical", "beginner", 60)
    members = [
        _member("fee", fee=50),
        _member("mode", mode="online"),
        _member("busy", windows=False),
    ]
    decision = assess_candidate(candidate, members, {}, min_people_available=2)
    assert not decision.accepted
    assert "min_people_available" in decision.reason_codes
    assert "fee_excludes_members" in decision.reason_codes
    assert "mode_excludes_members" in decision.reason_codes
    assert decision.unavailable_members == {
        "fee": ("fee_above_member_max",),
        "mode": ("mode_mismatch",),
        "busy": ("not_available",),
    }
    date_decision = assess_candidate(candidate, [_member("a")], {DAY: ("exam_week", "holiday")}, min_people_available=1)
    assert set(date_decision.reason_codes) >= {"exam_week", "holiday"}
    too_many = PlanCandidate("f1", "event", DAY, "evening", datetime.combine(DAY, time(18)),
                             "in_person", 0, 2, 1, "technical", "beginner", 60)
    capacity_decision = assess_candidate(too_many, [_member(f"m{i}") for i in range(3)], {}, min_people_available=1)
    assert "format_capacity_exceeded" in capacity_decision.reason_codes


def test_logistic_model_and_all_three_baselines_return_bounded_probabilities():
    formats = [_format("f1"), _format("f2", category="social")]
    observations = [
        PlanObservation("m1", "f1" if index % 2 else "f2", "evening", index * 10,
                        "in_person" if index % 2 else "online", index % 3 != 0,
                        timestamp=datetime(2026, 1, 1) + timedelta(days=index))
        for index in range(30)
    ]
    candidates = generate_candidates(formats, DAY, 1)[:3]
    members = [_member("m1"), _member("m2")]
    model = LogisticAttendanceModel(seed=19)
    model.fit(observations, formats)
    assert model.is_trained
    affinities = build_format_affinities(["m1", "m2"], formats, observations)
    model_scores = model.predict(["m1", "m2"], candidates, formats, members, observations, affinities)
    assert model_scores.shape == (len(candidates), 2)
    assert np.isfinite(model_scores).all() and ((model_scores >= 0) & (model_scores <= 1)).all()
    for baseline in (
        random_baseline(["m1", "m2"], candidates, seed=19),
        popularity_baseline(["m1", "m2"], candidates, observations),
        repeat_last_baseline(["m1", "m2"], candidates, observations),
    ):
        assert baseline.shape == model_scores.shape
        assert np.isfinite(baseline).all() and ((baseline >= 0) & (baseline <= 1)).all()
    np.testing.assert_array_equal(
        random_baseline(["m1"], candidates, seed=19), random_baseline(["m1"], candidates, seed=19)
    )


def test_cold_start_affinity_uses_related_category_and_skill_history():
    formats = [_format("f1", category="technical"),
               PlanFormat("f2", "Related format", "f2", "technical", "intermediate", 60, 0,
                          ("in_person",), 1, 100),
               _format("f3", category="social")]
    observations = [PlanObservation("m1", "f1", "evening", 0, "in_person", True)]
    affinities = build_format_affinities(["m1"], formats, observations)
    estimate = affinities[("m1", "f2")]
    assert estimate.is_cold_start is True
    assert estimate.evidence_count >= 1
    assert estimate.probability > 0.5
    assert estimate.confidence == "low"


def test_diversity_mmr_prefers_a_new_format_category_when_relevance_is_close():
    order = rerank_diverse([0, 1, 2], [0.90, 0.88, 0.70], ["technical", "technical", "social"], top_k=2)
    assert order == [0, 2]


def test_pipeline_marks_unavailable_members_and_returns_rejections():
    formats = [_format(f"f{i}", fee=0 if i == 0 else 99) for i in range(2)]
    members = [_member("m1", fee=0), _member("m2", fee=0), _member("m3", windows=False)]
    result = build_plan(members=members, formats=formats, observations=[], start_date=DAY,
                        horizon_days=1, min_people_available=2, top_k=2, diversity=True)
    assert result["candidate_count"] == 20
    assert result["rejected_candidates"]
    assert all("reason_codes" in item for item in result["rejected_candidates"])
    assert result["recommendations"]
    output = result["recommendations"][0]
    assert output["per_member_satisfaction"]["m3"]["available"] is False
    assert output["per_member_satisfaction"]["m3"]["satisfaction"] is None
    assert len(output["expected_attendance_interval_95"]) == 2
    assert output["why_line_inputs"]["strategy"] == "average"


def test_two_hundred_member_twenty_one_day_plan_under_two_seconds():
    members = [_member(f"m{i:03d}") for i in range(200)]
    formats = [_format(f"f{i:02d}", category=("social" if i % 2 else "technical"), maximum=250) for i in range(16)]
    started = perf_counter()
    result = build_plan(members=members, formats=formats, observations=[], start_date=DAY,
                        horizon_days=21, min_people_available=5, top_k=10, seed=42)
    elapsed = perf_counter() - started
    assert result["candidate_count"] == 16 * 21 * 5 * 2
    assert result["feasible_count"] == result["candidate_count"]
    assert elapsed < 2.0, f"200-member 21-day plan took {elapsed:.3f}s"

