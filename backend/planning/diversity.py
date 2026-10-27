"""MMR-style result reranking using event format category similarity."""

from __future__ import annotations

from typing import Sequence

from . import config

def rerank_diverse(
    sorted_indices: Sequence[int], relevance_scores: Sequence[float], categories: Sequence[str],
    *, top_k: int, relevance_weight: float = config.MMR_RELEVANCE_WEIGHT
) -> list[int]:
    """Choose relevant candidates while penalizing repeated categories.

    Category similarity is 1 for a category already selected and 0 otherwise.
    Stable input order breaks ties.
    """
    if top_k < 1 or not 0 <= relevance_weight <= 1 or len(categories) != len(relevance_scores) or len(categories) <= max(sorted_indices, default=-1):
        raise ValueError("Invalid diversity reranking inputs")
    remaining = list(sorted_indices)
    selected: list[int] = []
    selected_categories: set[str] = set()
    while remaining and len(selected) < top_k:
        best_position = 0
        best_value = float("-inf")
        for position, index in enumerate(remaining):
            similarity = float(categories[index] in selected_categories)
            value = relevance_weight * relevance_scores[index] - (1 - relevance_weight) * similarity
            if value > best_value:
                best_position, best_value = position, value
        chosen = remaining.pop(best_position)
        selected.append(chosen)
        selected_categories.add(categories[chosen])
    return selected

