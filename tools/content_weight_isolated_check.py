"""Isolated, held-out-test-split check of content-weight candidates for score_members.

The evaluation harness's validation-only weight search (backend/evaluation/runner.py)
always drives CONTENT_BASE_WEIGHT to 0, maximizing Brier score alone; it never weighs
the fairness cost that comes with it. This script checks a smaller, specific candidate
(content=0.05) against both the untuned default (0.20) and the search's full-zero pick
on the actual held-out test split, using each seed's already-selected aggregation
strategy, to see whether a partial reduction is a better Pareto point. It is the
evidence behind CONTENT_BASE_WEIGHT in backend/recsys/config.py.

    python tools/content_weight_isolated_check.py
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd
from scipy.stats import sem, t
from sqlalchemy import create_engine
from sqlalchemy.orm import Session as OrmSession

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
import sys

sys.path.insert(0, str(REPOSITORY_ROOT))
sys.path.insert(0, str(REPOSITORY_ROOT / "backend"))

from app.models import EmbeddingCache
from evaluation.runner import evaluate_window, temporal_split
from synthetic_data.exporter import export_feature_datasets
from synthetic_data.generator import GenerationConfig, SyntheticDatasetGenerator

SEEDS = (42, 43, 44, 45, 46)
# Each seed's validation-selected aggregation strategy, from results/evaluation/metrics_by_seed.csv's
# tuned_strategy column at the time this was run; re-read that file if the seeds or data change.
TUNED_STRATEGY = {42: "most_pleasure", 43: "approval", 44: "multiplicative", 45: "least_misery", 46: "multiplicative"}
CANDIDATES = {
    "default_0.20": {"explicit": 0.5, "implicit": 0.35, "time": 0.15, "content": 0.20},
    "mid_0.05": {"explicit": 0.5, "implicit": 0.35, "time": 0.15, "content": 0.05},
    "tuned_0.00": {"explicit": 0.6, "implicit": 0.4, "time": 0.1, "content": 0.0},
}
OUTPUT = REPOSITORY_ROOT / "results" / "evaluation" / "content_weight_isolated_comparison.csv"


def main() -> None:
    rows: list[dict] = []
    for seed in SEEDS:
        strategy = TUNED_STRATEGY[seed]
        generator = SyntheticDatasetGenerator(GenerationConfig(seed=seed))
        generator.generate_all()
        tables = export_feature_datasets(generator)
        events = tables["events"].copy()
        events["start_time"] = pd.to_datetime(events["start_time"])
        train, validation, test = temporal_split(events)
        test_fit = pd.concat([train, validation]).sort_values(["start_time", "id"], kind="stable")
        cache_engine = create_engine("sqlite+pysqlite:///:memory:")
        EmbeddingCache.__table__.create(cache_engine)
        session = OrmSession(cache_engine)
        for name, weights in CANDIDATES.items():
            result = evaluate_window(test_fit, test, tables, seed=seed, strategy=strategy, methods=["main_model"], embedding_session=session, base_weights=weights)["main_model"]
            rows.append({"seed": seed, "candidate": name, **result})
        session.close()
        cache_engine.dispose()
        print(f"seed {seed} done")

    frame = pd.DataFrame(rows)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(OUTPUT, index=False)
    print(f"\nWrote {OUTPUT.relative_to(REPOSITORY_ROOT)}")

    for metric in ["brier_score", "satisfaction_gini", "type_hit_rate", "precision_at_3"]:
        print(f"\n{metric}:")
        for name in CANDIDATES:
            values = frame[frame.candidate == name][metric].to_numpy(dtype=float)
            margin = float(t.ppf(0.975, len(values) - 1) * sem(values)) if len(values) > 1 else 0.0
            print(f"  {name}: {values.mean():.4f} [{values.mean() - margin:.4f}, {values.mean() + margin:.4f}]")

    print("\nPaired deltas (mid_0.05 minus the other two candidates):")
    for metric in ["brier_score", "satisfaction_gini", "type_hit_rate", "precision_at_3", "mean_satisfaction"]:
        mid = frame[frame.candidate == "mid_0.05"].set_index("seed")[metric]
        default = frame[frame.candidate == "default_0.20"].set_index("seed")[metric]
        tuned = frame[frame.candidate == "tuned_0.00"].set_index("seed")[metric]
        delta_default = (mid - default).to_numpy(dtype=float)
        delta_tuned = (mid - tuned).to_numpy(dtype=float)
        margin_default = float(t.ppf(0.975, len(delta_default) - 1) * sem(delta_default)) if len(delta_default) > 1 else 0.0
        margin_tuned = float(t.ppf(0.975, len(delta_tuned) - 1) * sem(delta_tuned)) if len(delta_tuned) > 1 else 0.0
        print(
            f"  {metric}: mid-default = {delta_default.mean():+.4f} [{delta_default.mean() - margin_default:+.4f}, {delta_default.mean() + margin_default:+.4f}]"
            f"   mid-tuned = {delta_tuned.mean():+.4f} [{delta_tuned.mean() - margin_tuned:+.4f}, {delta_tuned.mean() + margin_tuned:+.4f}]"
        )


if __name__ == "__main__":
    main()
