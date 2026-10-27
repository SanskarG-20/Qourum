"""Utilities for deterministic two-objective Pareto-front selection."""

from __future__ import annotations

from typing import Mapping, Sequence


def pareto_front_ids(
    points: Sequence[Mapping[str, object]],
    *,
    x_key: str = "expected_turnout",
    y_key: str = "least_happy_satisfaction",
    id_key: str = "id",
) -> list[str]:
    """Return IDs not dominated when both expected turnout and satisfaction are maximized."""
    front = []
    for point in points:
        x_value = float(point[x_key])
        y_value = float(point[y_key])
        dominated = any(
            float(other[x_key]) >= x_value
            and float(other[y_key]) >= y_value
            and (float(other[x_key]) > x_value or float(other[y_key]) > y_value)
            for other in points if other[id_key] != point[id_key]
        )
        if not dominated:
            front.append(str(point[id_key]))
    return front
