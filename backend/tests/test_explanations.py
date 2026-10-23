"""Explanation templates stay deterministic and numerically evidence-backed."""

import re

from backend.recsys.explanations import counterfactual_evidence, factor_summary, render_counterfactual, render_explanation


def _numeric_tokens(text: str) -> list[str]:
    return re.findall(r"(?<![A-Za-z])\d+(?:\.\d+)?", text)


def test_recommendation_explanation_uses_only_rounded_evidence_values():
    evidence = {
        "strategy": "least_misery",
        "strategy_score": 0.714,
        "group_mean": 0.802,
        "group_min": 0.714,
        "group_std": 0.044,
        "top_factors": factor_summary({"explicit_rating": 0.83, "implicit_attendance": 0.61, "time_affinity": None}),
        "per_member_satisfaction": {"m1": 0.714, "m2": 0.89},
        "constraint_status": {"feasible": True, "reason_codes": [], "availability_fraction": 0.8, "expected_attendance": 6.25, "quorum_required": 5},
    }
    text = render_explanation(evidence)
    source_values = {f"{value:.3f}" for key, value in evidence.items() if isinstance(value, float)}
    source_values |= {f"{value:.2f}" for value in evidence["constraint_status"].values() if isinstance(value, float)}
    source_values.add(str(evidence["constraint_status"]["quorum_required"]))
    source_values |= {f"{factor['value']:.3f}" for factor in evidence["top_factors"]}
    assert _numeric_tokens(text)
    assert set(_numeric_tokens(text)) <= source_values
    assert text == render_explanation(evidence)


def test_counterfactual_names_largest_positive_computed_factor_gap():
    evidence = counterfactual_evidence(
        "Workshop", 0.82, {"explicit_rating": 0.9, "time_affinity": 0.7},
        "Movie night", 0.71, {"explicit_rating": 0.6, "time_affinity": 0.68},
    )
    assert evidence["factor"] == "explicit_rating"
    text = render_counterfactual(evidence)
    assert "explicit_rating" in text
    assert set(_numeric_tokens(text)) <= {"0.900", "0.600", "0.110"}

