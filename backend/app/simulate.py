"""Run the local synthetic recommendation-feedback simulation."""

from __future__ import annotations

import argparse
from pathlib import Path

if __package__ == "app" or __package__.startswith("app."):
    from simulation.runner import run_simulation
else:
    from backend.simulation.runner import run_simulation


def main() -> None:
    parser = argparse.ArgumentParser(description="Run seeded local Quorum recommendation simulation rounds.")
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--rounds", type=int, default=10)
    parser.add_argument("--club", default="ACM & Robotics Guild")
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()
    output = args.output or Path("results") / f"simulation_seed_{args.seed}.csv"
    records = run_simulation(args.seed, args.rounds, output, club_name=args.club)
    print(f"Wrote {len(records)} rounds to {output}")
    print("round | event type | mean satisfaction | min satisfaction | attendance/quorum | quorum success")
    for result in records:
        print(f"{result['round']:>5} | {result['event_type'] or 'no feasible event'} | {result['mean_satisfaction']:.4f} | {result['minimum_satisfaction']:.4f} | {result['actual_attendance']}/{result['quorum_required']} | {result['quorum_success']}")


if __name__ == "__main__":
    main()
