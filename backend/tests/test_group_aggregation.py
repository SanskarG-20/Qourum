"""Toy-group tests for strategy differences, fairness, and diversity ranking."""

from datetime import datetime, timedelta

import numpy as np

from backend.recsys.group import FairnessRecord, aggregate_scores, fairness_weights, mmr_rerank, rank_group_candidates


NOW = datetime(2026, 10, 23)


def test_aggregation_strategies_disagree_on_toy_group():
    group = np.array([[1.0, 0.0], [0.6, 0.6]])
    average = aggregate_scores(group, "average")
    pleasure = aggregate_scores(group, "most_pleasure")
    misery = aggregate_scores(group, "least_misery")
    assert int(np.argmax(average)) == 1
    assert int(np.argmax(pleasure)) == 0
    assert int(np.argmax(misery)) == 1


def test_fairness_boost_changes_a_designed_aggregate_winner():
    group = np.array([[0.9, 0.8], [0.6, 1.0]])
    assert int(np.argmax(aggregate_scores(group, "average"))) == 0
    weights = fairness_weights(["m1", "m2"], {"m2": FairnessRecord(0.0, NOW)}, now=NOW)
    assert weights[1] > weights[0]
    assert int(np.argmax(aggregate_scores(group, "average", member_weights=weights))) == 1
    decayed = fairness_weights(["m1", "m2"], {"m2": FairnessRecord(0.0, NOW - timedelta(days=10000))}, now=NOW)
    assert np.allclose(decayed, [1, 1], atol=1e-5)


def test_mmr_penalizes_recent_and_selected_event_types():
    ranking = rank_group_candidates([[0.9, 0.9], [0.8, 0.8], [0.7, 0.7]], "average")
    selected = mmr_rerank(ranking, ["workshop", "workshop", "talk"], top_n=3, recent_event_types=["workshop"])
    assert selected[0].candidate_index == 2
    assert selected[1].candidate_index == 0
    assert selected[2].candidate_index == 1


def test_all_strategies_return_bounded_stable_candidate_scores():
    values = [[0.2, 0.8, 0.4], [0.9, 0.5, 0.7], [0.4, 0.4, 0.4]]
    for strategy in ("average", "least_misery", "most_pleasure", "multiplicative", "borda", "approval", "average_without_misery"):
        scores = aggregate_scores(values, strategy)
        assert np.all((scores >= 0) & (scores <= 1))
        assert np.array_equal(scores, aggregate_scores(values, strategy))
