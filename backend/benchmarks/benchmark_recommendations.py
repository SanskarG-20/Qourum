"""Measure the pure recommend pipeline for 60 members and 500 candidates."""

from __future__ import annotations

import argparse
from datetime import datetime, time, timedelta
from pathlib import Path
import sys
from time import perf_counter

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.recsys.candidates import Candidate, assess_candidate
from backend.recsys.group import rank_group_candidates
from backend.recsys.individual import AttendanceObservation, ContentSignal, TimeObservation, score_members


def benchmark(seed: int, runs: int) -> tuple[float, float]:
    """Return p50 and nearest-rank p95 milliseconds for a deterministic workload."""
    rng = np.random.default_rng(seed)
    member_ids = [f"member-{index:02}" for index in range(60)]
    event_types = [f"type-{index}" for index in range(8)]
    now = datetime(2026, 10, 23)
    preferences = {member: {event_type: int(rng.integers(1, 6)) for event_type in event_types if rng.random() < .45} for member in member_ids}
    attendance = {
        member: [AttendanceObservation(event_types[int(rng.integers(0, len(event_types)))], "yes" if rng.random() < .7 else "no", rng.random() < .65, now - timedelta(days=int(rng.integers(0, 500)))) for _ in range(20)]
        for member in member_ids
    }
    slots = {member: [TimeObservation(int(rng.integers(0, 7)), int(rng.integers(9, 21)), rng.random() < .6) for _ in range(12)] for member in member_ids}
    content = {event_type: {member: ContentSignal(float(rng.random()), int(rng.integers(1, 20))) for member in member_ids} for event_type in event_types}
    availability = {member: [(day, time(9), time(21)) for day in range(7)] for member in member_ids}
    candidates = [Candidate(event_types[index % len(event_types)], now + timedelta(days=index % 21, hours=9 + index % 12), 60, "Benchmark room") for index in range(500)]

    timings: list[float] = []
    for _ in range(runs):
        started = perf_counter()
        score_cache: dict[tuple[str, int, int], list[float]] = {}
        satisfaction = []
        for candidate in candidates:
            key = (candidate.event_type_id, candidate.start.weekday(), candidate.start.hour)
            if key not in score_cache:
                scores = score_members(member_ids, key[0], key[1], key[2], preferences, attendance, slots, now=now, popularity_fallback=.5, content_evidence=content[key[0]])
                score_cache[key] = [item.score for item in scores]
            scores = score_cache[key]
            assessment = assess_candidate(candidate, dict(zip(member_ids, scores)), availability, quorum=5)
            if assessment.feasible:
                satisfaction.append(scores)
        if satisfaction:
            rank_group_candidates(satisfaction, "average")
        timings.append((perf_counter() - started) * 1000)
    ordered = sorted(timings)
    p50 = float(np.percentile(ordered, 50))
    p95 = float(np.percentile(ordered, 95, method="higher"))
    return p50, p95


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--runs", type=int, default=10)
    args = parser.parse_args()
    if args.runs < 1:
        parser.error("--runs must be positive")
    p50, p95 = benchmark(args.seed, args.runs)
    print(f"Benchmark: 60 members x 500 candidates (seed={args.seed}, runs={args.runs})")
    print(f"p50: {p50:.2f} ms")
    print(f"p95: {p95:.2f} ms")
    print(f"target (<1000 ms p95): {'PASS' if p95 < 1000 else 'FAIL'}")


if __name__ == "__main__":
    main()
