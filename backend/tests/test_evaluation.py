"""Temporal evaluation uses chronological partitions and requires five seeds."""

import pandas as pd
import pytest

from backend.evaluation.runner import paired_comparison_table, temporal_split


def test_temporal_split_is_ordered_and_70_15_15_by_time():
    events = pd.DataFrame({"id": [f"e{index:02}" for index in range(20)], "start_time": pd.date_range("2025-01-01", periods=20, freq="D")})
    train, validation, test = temporal_split(events.sample(frac=1, random_state=7))
    assert len(train) == 14
    assert len(validation) == 3
    assert len(test) == 3
    assert train.start_time.max() < validation.start_time.min()
    assert validation.start_time.max() < test.start_time.min()


def test_temporal_split_rejects_too_few_events():
    with pytest.raises(ValueError):
        temporal_split(pd.DataFrame({"id": ["only"], "start_time": [pd.Timestamp("2026-01-01")]}))


def test_paired_comparison_only_marks_ci_separated_from_zero_as_a_win():
    per_seed = pd.DataFrame([
        {"seed": seed, "method": "main_model", "brier_score": 0.19 if seed == 0 else 0.205, "mean_satisfaction": 0.6 + seed * 0.01, "best_baseline": "club_popularity"}
        for seed in range(5)
    ] + [
        {"seed": seed, "method": "club_popularity", "brier_score": 0.20, "mean_satisfaction": 0.6, "best_baseline": "club_popularity"}
        for seed in range(5)
    ])
    comparison = paired_comparison_table(per_seed, "club_popularity").set_index("metric")
    assert bool(comparison.loc["mean_satisfaction", "beats_baseline"])
    assert not bool(comparison.loc["brier_score", "beats_baseline"])
