"""Seeded, observable synthetic dataset for club event planning experiments.

This research dataset is deliberately separate from the app seed generator. It
uses a normalized CSV-friendly schema and does not change recommender inputs.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
import uuid

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class ResearchGenerationConfig:
    """Controls all random choices and the generated historical window."""

    seed: int = 42
    num_clubs: int = 5
    min_members: int = 25
    max_members: int = 60
    history_months: int = 18
    end_date: date = date(2026, 10, 26)
    club_conflict_levels: tuple[float, ...] | None = None

    def __post_init__(self) -> None:
        if self.num_clubs not in (5, 6):
            raise ValueError("num_clubs must be 5 or 6")
        if not 25 <= self.min_members <= self.max_members <= 60:
            raise ValueError("member bounds must satisfy 25 <= min_members <= max_members <= 60")
        if not 12 <= self.history_months <= 24:
            raise ValueError("history_months must be between 12 and 24")
        if self.club_conflict_levels is not None:
            if len(self.club_conflict_levels) != self.num_clubs or any(not 0 <= value <= 1 for value in self.club_conflict_levels):
                raise ValueError("club_conflict_levels must contain one value in [0, 1] per club")


FORMAT_CATALOG = (
    ("Hackathon", "technical", 12, 0, True, "intermediate", 14, 20, 120),
    ("Case Competition", "competitive", 8, 0, True, "intermediate", 10, 12, 80),
    ("Campus Quest / Hunter Quest", "social", 3, 0, True, "beginner", 4, 15, 100),
    ("Ideathon", "learning", 6, 0, True, "beginner", 7, 12, 80),
    ("Pitch Challenge", "competitive", 5, 0, False, "intermediate", 7, 10, 60),
    ("Coding Contest", "technical", 4, 0, False, "intermediate", 5, 10, 100),
    ("Robotics Build Sprint", "technical", 8, 150, True, "intermediate", 10, 10, 50),
    ("Design Jam", "learning", 6, 0, True, "beginner", 5, 10, 60),
    ("Tech Talk", "learning", 2, 0, False, "beginner", 2, 8, 150),
    ("Resume and Portfolio Clinic", "learning", 2, 0, False, "beginner", 2, 6, 40),
    ("Board Game Social", "social", 3, 100, True, "beginner", 1, 8, 50),
    ("Alumni Networking Mixer", "social", 3, 250, False, "beginner", 2, 10, 100),
    ("Project Showcase", "technical", 4, 0, True, "beginner", 4, 10, 100),
    ("Peer Learning Circle", "learning", 2, 0, True, "beginner", 1, 5, 30),
    ("Esports Tournament", "competitive", 5, 100, True, "beginner", 3, 10, 80),
    ("Community Volunteering Day", "social", 5, 0, True, "beginner", 2, 10, 100),
)

PERSONA_PARAMETERS = {
    "enthusiast": {"fee_sensitivity": 0.20, "evening_preference": 0.70, "exam_dropout": 0.12, "engagement": "high"},
    "social_only": {"fee_sensitivity": 0.55, "evening_preference": 0.85, "exam_dropout": 0.35, "engagement": "medium"},
    "competitive": {"fee_sensitivity": 0.30, "evening_preference": 0.55, "exam_dropout": 0.18, "engagement": "high"},
    "casual": {"fee_sensitivity": 0.80, "evening_preference": 0.55, "exam_dropout": 0.50, "engagement": "low"},
    "exam_sensitive": {"fee_sensitivity": 0.50, "evening_preference": 0.65, "exam_dropout": 0.88, "engagement": "medium"},
}

TIME_BLOCKS = ("morning", "midday", "afternoon", "evening", "late_evening")
MODES = ("in_person", "online")


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _month_shift(value: date, months: int) -> date:
    index = value.year * 12 + value.month - 1 + months
    year, month0 = divmod(index, 12)
    month = month0 + 1
    next_month = date(year + (month == 12), 1 if month == 12 else month + 1, 1)
    return date(year, month, min(value.day, (next_month - timedelta(days=1)).day))


class ResearchDatasetGenerator:
    """Create the normalized research tables deterministically from a seed."""

    def __init__(self, config: ResearchGenerationConfig = ResearchGenerationConfig()):
        self.config = config
        self.rng = np.random.default_rng(config.seed)
        self.tables: dict[str, pd.DataFrame] = {}
        self._ids: dict[str, str] = {}

    def _id(self, key: str) -> str:
        if key not in self._ids:
            # Stable namespace+key IDs make synthetic CSV merges repeatable.
            self._ids[key] = str(uuid.uuid5(uuid.NAMESPACE_URL, f"quorum-synthetic:{self.config.seed}:{key}"))
        return self._ids[key]

    def generate(self) -> dict[str, pd.DataFrame]:
        """Return normalized tables; no latent persona or behavior parameters are exported."""
        club_rows = []
        member_rows = []
        persona_by_member: dict[str, str] = {}
        slot_fit: dict[str, str] = {}
        for club_index in range(self.config.num_clubs):
            club_id = self._id(f"club:{club_index}")
            conflict = float(self.config.club_conflict_levels[club_index]) if self.config.club_conflict_levels is not None else round(float(self.rng.uniform(0.0, 1.0)), 3)
            club_rows.append({"club_id": club_id, "name": f"Campus Club {club_index + 1}", "conflict_level": conflict})
            club_persona_anchor = str(self.rng.choice(tuple(PERSONA_PARAMETERS)))
            size = int(self.rng.integers(self.config.min_members, self.config.max_members + 1))
            for member_index in range(size):
                member_id = self._id(f"member:{club_index}:{member_index}")
                persona = str(self.rng.choice(tuple(PERSONA_PARAMETERS))) if self.rng.random() < conflict else club_persona_anchor
                params = PERSONA_PARAMETERS[persona]
                mode_pref = str(self.rng.choice(("in_person", "online", "either"), p=(0.62, 0.13, 0.25)))
                row = {
                    "member_id": member_id,
                    "club_id": club_id,
                    "year": int(self.rng.integers(1, 5)),
                    "branch": str(self.rng.choice(("Computer Science", "Electronics", "Design", "Business", "Mechanical"))),
                    "role": "core" if member_index < max(3, round(size * 0.12)) else "regular",
                    "join_month": _month_shift(_month_start(self.config.end_date), -int(self.rng.integers(0, self.config.history_months))).strftime("%Y-%m"),
                    "max_fee": int(self.rng.choice((0, 100, 250, 500, 1000))),
                    "mode_pref": mode_pref,
                    "commute_type": str(self.rng.choice(("walk", "transit", "cycle", "residential"))),
                    "engagement_level": params["engagement"],
                }
                member_rows.append(row)
                persona_by_member[member_id] = persona
                slot_probs = np.array((0.06, 0.10, 0.18, params["evening_preference"], max(0.04, 0.66 - params["evening_preference"])), dtype=float)
                slot_probs /= slot_probs.sum()
                slot_fit[member_id] = str(self.rng.choice(TIME_BLOCKS, p=slot_probs))

        format_rows = []
        for index, spec in enumerate(FORMAT_CATALOG):
            name, category, duration, fee, team, skill, prep, min_cap, max_cap = spec
            format_rows.append({
                "format_id": self._id(f"format:{index}"), "name": name, "category": category,
                "duration_hrs": duration, "typical_fee": fee, "team_based": team,
                "skill_level": skill, "prep_days": prep, "min_capacity": min_cap, "max_capacity": max_cap,
            })

        start = _month_shift(self.config.end_date, -self.config.history_months)
        dates = [start + timedelta(days=i) for i in range((self.config.end_date - start).days + 1)]
        calendar_rows = []
        for day in dates:
            month = day.month
            # Calendar labels are simulated academic patterns, not institution schedules.
            exam = month in (4, 5, 11, 12) and 8 <= day.day <= 21
            fest = month in (1, 2, 9, 10) and 10 <= day.day <= 24
            calendar_rows.append({
                "date": day.isoformat(), "exam_week": bool(exam),
                "holiday": day.weekday() == 6 or (month == 1 and day.day == 1),
                "fest_week": bool(fest), "lab_heavy_day": day.weekday() in (1, 3),
            })
        calendar_frame = pd.DataFrame(calendar_rows)
        exam_dates = set(calendar_frame.loc[calendar_frame.exam_week, "date"])

        availability_rows = []
        for row in member_rows:
            member_id = row["member_id"]
            for weekday in range(7):
                for block in TIME_BLOCKS:
                    preferred = block == slot_fit[member_id]
                    p_free = 0.74 if preferred else 0.48
                    status = str(self.rng.choice(("free", "maybe", "busy"), p=(p_free, 0.12, 1 - p_free - 0.12)))
                    availability_rows.append({"member_id": member_id, "day_of_week": weekday, "time_block": block, "status": status})

        format_by_id = {row["format_id"]: row for row in format_rows}
        events, attendance = [], []
        month_count = self.config.history_months
        for club in club_rows:
            club_members = [r for r in member_rows if r["club_id"] == club["club_id"]]
            club_format_ids = [r["format_id"] for r in format_rows]
            event_count = max(18, month_count * 3)
            selected_days = sorted(self.rng.choice(len(dates), size=min(event_count, len(dates)), replace=False).tolist())
            for ordinal, day_index in enumerate(selected_days):
                event_date = dates[day_index]
                fmt_id = str(self.rng.choice(club_format_ids))
                fmt = format_by_id[fmt_id]
                block = str(self.rng.choice(TIME_BLOCKS, p=(0.07, 0.12, 0.22, 0.43, 0.16)))
                mode = str(self.rng.choice(MODES, p=(0.78, 0.22)))
                fee = int(max(0, round(fmt["typical_fee"] * float(self.rng.uniform(0.75, 1.25)) / 10) * 10))
                capacity = int(self.rng.integers(fmt["min_capacity"], fmt["max_capacity"] + 1))
                event_id = self._id(f"event:{club['club_id']}:{ordinal}")
                event_attendance = []
                for member in club_members:
                    member_id = member["member_id"]
                    persona = persona_by_member[member_id]
                    params = PERSONA_PARAMETERS[persona]
                    affinity = {
                        "enthusiast": 0.72,
                        "social_only": 0.68 if fmt["category"] == "social" else 0.12,
                        "competitive": 0.75 if fmt["category"] == "competitive" else 0.28,
                        "casual": 0.42,
                        "exam_sensitive": 0.55,
                    }[persona]
                    if fee > member["max_fee"]:
                        affinity *= max(0.05, 1 - params["fee_sensitivity"] * (fee - member["max_fee"]) / max(100, fee))
                    if member["mode_pref"] not in (mode, "either"):
                        affinity *= 0.45
                    if block != slot_fit[member_id]:
                        affinity *= 0.62
                    if event_date.isoformat() in exam_dates:
                        affinity *= 1 - params["exam_dropout"]
                    registered = bool(self.rng.random() < min(0.92, max(0.02, affinity)))
                    if registered:
                        attended = bool(self.rng.random() < (0.88 if event_date.isoformat() not in exam_dates else 0.58))
                        rating = int(np.clip(round(self.rng.normal(4.1 if attended else 2.5, 0.8)), 1, 5)) if attended else None
                    else:
                        attended, rating = False, None
                    event_attendance.append({"event_id": event_id, "member_id": member_id, "registered": registered, "attended": attended, "rating": rating})
                registered_rows = [row for row in event_attendance if row["registered"]]
                if len(registered_rows) > capacity:
                    admitted = set(self.rng.choice([row["member_id"] for row in registered_rows], size=capacity, replace=False).tolist())
                    for row in registered_rows:
                        if row["member_id"] not in admitted:
                            row.update(registered=False, attended=False, rating=None)
                attendance.extend(event_attendance)
                registered_count = sum(row["registered"] for row in event_attendance)
                attended_count = sum(row["attended"] for row in event_attendance)
                events.append({
                    "event_id": event_id, "club_id": club["club_id"], "format_id": fmt_id,
                    "date": event_date.isoformat(), "time_block": block, "mode": mode, "fee": fee,
                    "capacity": capacity, "registrations": registered_count,
                    "attended_count": attended_count,
                })

        self.tables = {
            "clubs": pd.DataFrame(club_rows),
            "members": pd.DataFrame(member_rows),
            "formats": pd.DataFrame(format_rows),
            "calendar": calendar_frame,
            "availability": pd.DataFrame(availability_rows),
            "events": pd.DataFrame(events),
            "attendance": pd.DataFrame(attendance),
        }
        return self.tables
