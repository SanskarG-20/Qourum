"""Export the backend evaluation summary to the JSON file the landing page renders.

The landing page must show the same numbers as results/evaluation/REPORT.md, so
they are generated from the evaluation CSVs rather than typed into the UI.

    python tools/export_landing_results.py
"""

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "results" / "evaluation"
OUTPUT = ROOT / "src" / "data" / "evaluationResults.json"

METHODS = [
    ("random", "Random", "Baseline"),
    ("club_popularity", "Club popularity", "Baseline"),
    ("most_recent", "Most recent type", "Baseline"),
    ("same_week_last_year", "Same week last year", "Baseline"),
    ("strategy_average", "Average", "Strategy"),
    ("strategy_least_misery", "Least misery", "Strategy"),
    ("strategy_most_pleasure", "Most pleasure", "Strategy"),
    ("strategy_multiplicative", "Multiplicative", "Strategy"),
    ("strategy_borda", "Borda", "Strategy"),
    ("strategy_approval", "Approval voting", "Strategy"),
    ("strategy_average_without_misery", "Average without misery", "Strategy"),
    ("main_model", "Main model (validation-selected strategy, fairness and diversity on)", "Main"),
]
METRICS = [
    "precision_at_3", "ndcg_at_3", "type_hit_rate", "brier_score",
    "mean_satisfaction", "min_satisfaction", "satisfaction_gini",
]


def main() -> None:
    summary: dict[str, dict[str, dict[str, float]]] = {}
    seeds = 0
    with (RESULTS / "summary_95ci.csv").open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            summary.setdefault(row["method"], {})[row["metric"]] = {
                "mean": round(float(row["mean"]), 3),
                "low": round(float(row["ci95_low"]), 3),
                "high": round(float(row["ci95_high"]), 3),
            }
            seeds = max(seeds, int(row["seeds"]))
    paired = {}
    with (RESULTS / "paired_comparison.csv").open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            paired[row["metric"]] = {
                "baseline": row["baseline"],
                "delta": round(float(row["mean_paired_delta"]), 3),
                "low": round(float(row["ci95_low"]), 3),
                "high": round(float(row["ci95_high"]), 3),
                "better": row["beats_baseline"] == "True",
            }
    payload = {
        "seeds": seeds,
        "metrics": METRICS,
        "rows": [
            {"id": method, "label": label, "family": family, "metrics": {metric: summary[method][metric] for metric in METRICS}}
            for method, label, family in METHODS
        ],
        "mainVsBaseline": {metric: paired[metric] for metric in METRICS},
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
