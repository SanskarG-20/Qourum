"""Seeded synthetic planning-recovery sweep for the Proof Page."""

from __future__ import annotations

from datetime import date, time
from math import ceil

import numpy as np

from backend.planning import config
from backend.planning.models import AvailabilityWindow, PlanFormat, PlanMember
from backend.planning.pipeline import build_plan
from backend.planning.relaxation import recover_plan

SWEEP_START = date(2027, 2, 1)
CLUB_SIZES = (5, 14, 60)
CONFLICT_LEVELS = (0.0, 0.5, 1.0)
SETTING_CASES = ("open", "fee_limited", "hard_calendar")


def sweep_settings(size: int, conflict: float, setting_case: str, seed: int) -> dict:
    """Build observable clubs; conflict changes availability divergence only."""
    if setting_case not in SETTING_CASES or size not in CLUB_SIZES or conflict not in CONFLICT_LEVELS:
        raise ValueError("Unknown reliability sweep scenario")
    rng = np.random.default_rng(seed + size * 100 + round(conflict * 10))
    block_count = 1 if conflict == 0 else 2 if conflict == 0.5 else 5
    block_hours = ((18, 19), (9, 10), (12, 13), (15, 16), (20, 22))
    assignments = np.arange(size) % block_count
    rng.shuffle(assignments)
    members = []
    for index, block in enumerate(assignments):
        begin, end = block_hours[int(block)]
        windows = tuple(AvailabilityWindow(day, time(begin), time(end), True) for day in range(7))
        members.append(PlanMember(f"member-{index:03d}", 100 if index % 3 else 0, "either", windows))
    formats = [
        PlanFormat("free-social", "Free social", "social", "social", "beginner", 60, 0,
                   ("in_person",), 2, size + 5),
        PlanFormat("paid-social", "Paid social", "social", "social", "beginner", 60, 100,
                   ("in_person",), 2, size + 5),
        PlanFormat("free-learning", "Free learning", "learning", "learning", "beginner", 60, 0,
                   ("online",), 2, size + 5),
    ]
    floor = max(config.RELAX_MIN_MEMBER_FLOOR, ceil(config.RELAX_MIN_MEMBER_FRACTION * size))
    settings = dict(
        members=members, formats=formats, observations=[], calendar_flags={
            SWEEP_START: ["holiday"], date.fromordinal(SWEEP_START.toordinal() + 1): ["exam_week"],
        }, start_date=SWEEP_START, horizon_days=3, min_people_available=floor,
        strategy="average", top_k=3, diversity=False, fee_cap_inr=None,
    )
    if setting_case == "fee_limited":
        settings.update(selected_format_ids=["paid-social"], fee_cap_inr=0)
    elif setting_case == "hard_calendar":
        settings.update(horizon_days=1, only_date=SWEEP_START)
    return settings


def reliability_sweep(seed: int) -> dict:
    """Run the same strict/closest/none path used by the live planning endpoint."""
    rows = []
    for size in CLUB_SIZES:
        for conflict in CONFLICT_LEVELS:
            for case in SETTING_CASES:
                settings = sweep_settings(size, conflict, case, seed)
                strict = build_plan(**settings)
                result = recover_plan(strict, settings)
                rows.append({"club_size": size, "conflict_level": conflict, "setting_case": case,
                             "tier": result["tier"], "strict_count": result["strict_count"],
                             "returned_count": len(result["recommendations"]),
                             "diagnosis_count": len(result["diagnosis"])})
    counts = {tier: sum(row["tier"] == tier for row in rows) for tier in ("exact", "closest", "none")}
    total = len(rows)
    return {"source": "synthetic", "seed": seed, "total": total, "counts": counts,
            "percentages": {tier: round(100 * count / total, 2) for tier, count in counts.items()},
            "cases": rows,
            "caveat": "This seeded settings sweep uses generated availability and calendar patterns; it does not measure performance on real clubs."}
