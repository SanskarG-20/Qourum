"""Deterministic explanation templates over already-computed recommendation evidence."""

from __future__ import annotations

from typing import Mapping, Sequence


def _number(value: float, places: int = 3) -> str:
    """Format an evidence number at the precision stored in the evidence object."""
    return f"{value:.{places}f}"


def render_explanation(evidence: Mapping[str, object]) -> str:
    """Render a fixed explanation using only the supplied evidence values."""
    strategy = str(evidence["strategy"])
    score = float(evidence["strategy_score"])
    mean = float(evidence["group_mean"])
    minimum = float(evidence["group_min"])
    spread = float(evidence["group_std"])
    constraints = evidence["constraint_status"]
    attendance = float(constraints["expected_attendance"])
    quorum = int(constraints["quorum_required"])
    factors = evidence["top_factors"]
    factor_phrase = "No preference history was available"
    if factors:
        strongest = factors[0]
        factor_phrase = f"The strongest model signal was {strongest['name']} ({_number(float(strongest['value']))})"
    return (
        f"{strategy.replace('_', ' ')} ranked this option at {_number(score)}. "
        f"Group satisfaction averages {_number(mean)}, with a minimum of {_number(minimum)} "
        f"and spread {_number(spread)}. {factor_phrase}. "
        f"Expected attendance is {_number(attendance, 2)} against quorum {quorum}."
    )


def render_counterfactual(counterfactual: Mapping[str, object]) -> str:
    """Explain a lower-ranked alternative using the recorded factor comparison."""
    alternative = str(counterfactual["alternative"])
    factor = str(counterfactual["factor"])
    selected_value = float(counterfactual["selected_value"])
    alternative_value = float(counterfactual["alternative_value"])
    score_gap = float(counterfactual["strategy_score_gap"])
    return (
        f"Why not {alternative}? This option ranked higher on {factor}: "
        f"{_number(selected_value)} versus {_number(alternative_value)}; "
        f"the strategy-score advantage was {_number(score_gap)}."
    )


def counterfactual_evidence(
    selected_label: str,
    selected_score: float,
    selected_factors: Mapping[str, float],
    alternative_label: str,
    alternative_score: float,
    alternative_factors: Mapping[str, float],
) -> dict[str, object]:
    """Create rounded, auditable evidence for why one candidate outranks another."""
    factor_names = sorted(set(selected_factors) | set(alternative_factors))
    differences = [(name, selected_factors.get(name, 0.0) - alternative_factors.get(name, 0.0)) for name in factor_names]
    positive = [item for item in differences if item[1] > 0]
    if positive:
        factor = max(positive, key=lambda item: (item[1], item[0]))[0]
        first = selected_factors.get(factor, 0.0)
        second = alternative_factors.get(factor, 0.0)
    else:
        factor = "group_strategy_score"
        first = selected_score
        second = alternative_score
    return {
        "selected": selected_label,
        "alternative": alternative_label,
        "factor": factor,
        "selected_value": round(first, 3),
        "alternative_value": round(second, 3),
        "strategy_score_gap": round(max(0.0, selected_score - alternative_score), 3),
    }


def factor_summary(components: Mapping[str, float | None]) -> list[dict[str, float | str]]:
    """Return up to three largest computed component means in stable order."""
    available = [(name, value) for name, value in components.items() if value is not None]
    return [{"name": name, "value": round(float(value), 3)} for name, value in sorted(available, key=lambda item: (-float(item[1]), item[0]))[:3]]
