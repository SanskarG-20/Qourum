"""Correctness tests for pure individual recommendation scoring."""

from datetime import datetime, timedelta

import numpy as np

from backend.recsys.individual import AttendanceObservation, ContentSignal, TimeObservation, club_attendance_fallback, score_members


NOW = datetime(2026, 1, 1, 12, 0)


def test_explicit_rating_is_monotonic_and_bounded():
    ids = ["low", "middle", "high"]
    result = score_members(ids, "talk", 2, 18, {key: {"talk": rating} for key, rating in zip(ids, [1, 3, 5])}, {}, {}, now=NOW)
    scores = [item.score for item in result]
    assert scores == sorted(scores)
    assert scores[0] == 0
    assert scores[-1] == 1
    assert all(0 <= item.score <= 1 for item in result)


def test_cold_start_uses_popularity_fallback():
    result = score_members(["new"], "talk", 0, 9, {}, {}, {}, now=NOW, popularity_fallback=0.73)[0]
    assert result.score == 0.73
    assert result.is_cold_start
    assert result.component_weights == {"club_popularity": 1.0}


def test_attendance_recency_and_outcomes_are_deterministic():
    recent = AttendanceObservation("talk", "yes", True, NOW - timedelta(days=1))
    old = AttendanceObservation("talk", "yes", False, NOW - timedelta(days=365))
    history = {"a": [recent], "b": [old]}
    scores = score_members(["a", "b"], "talk", 0, 10, {}, history, {}, now=NOW)
    again = score_members(["a", "b"], "talk", 0, 10, {}, history, {}, now=NOW)
    assert scores == again
    assert scores[0].score > scores[1].score
    assert np.isclose(scores[0].implicit_attendance, 1.0)


def test_time_affinity_uses_laplace_smoothing_and_bounds():
    observations = [TimeObservation(1, 17, True), TimeObservation(1, 17, True)]
    score = score_members(["m"], "other", 1, 17, {}, {}, {"m": observations}, now=NOW)[0]
    assert score.time_affinity == 0.75
    assert 0 <= score.score <= 1
    assert score.component_weights["time"] == 1.0


def test_content_similarity_is_monotonic_bounded_and_optional():
    baseline = score_members(["m"], "talk", 1, 17, {}, {}, {}, now=NOW, popularity_fallback=.5)[0]
    low = score_members(["m"], "talk", 1, 17, {}, {}, {}, now=NOW, popularity_fallback=.5, content_evidence={"m": ContentSignal(.2, 10)})[0]
    high = score_members(["m"], "talk", 1, 17, {}, {}, {}, now=NOW, popularity_fallback=.5, content_evidence={"m": ContentSignal(.9, 10)})[0]
    disabled = score_members(["m"], "talk", 1, 17, {}, {}, {}, now=NOW, popularity_fallback=.5, content_evidence={"m": ContentSignal(.9, 10)}, content_enabled=False)[0]
    assert 0 <= low.score <= high.score <= 1
    assert low.score < high.score
    assert high.content_similarity == .9
    assert np.isclose(high.confidence["content"], 10 / 13)
    assert disabled.score == baseline.score
    assert baseline.is_cold_start and high.is_cold_start is False


def test_club_attendance_fallback_is_a_smoothed_probability():
    assert club_attendance_fallback({}, "talk") == 0.5
    outcomes = {"talk": (8, 10), "social": (2, 10)}
    talk = club_attendance_fallback(outcomes, "talk")
    social = club_attendance_fallback(outcomes, "social")
    unseen = club_attendance_fallback(outcomes, "workshop")
    assert 0.0 <= social < unseen < talk <= 1.0
    assert abs(unseen - 0.5) < 1e-12
    assert talk < 0.8
