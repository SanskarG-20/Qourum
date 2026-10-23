"""Seeded end-to-end recommendation/attendance/feedback simulation."""

from __future__ import annotations

from dataclasses import replace
from datetime import date, datetime, timedelta
import csv
from pathlib import Path
import tempfile
import uuid

from sqlalchemy import select

if __package__ == "simulation" or __package__.startswith("simulation."):
    from app.database import create_database_engine, make_session_factory
    from app.feedback import AttendanceFeedback, EventFeedback, record_event_feedback
    from app.models import Club, ClubMember, Event, User
    from app.recommendations import recommend_for_club
    from app.seed import seed_database
    from synthetic_data.calendar import is_break_or_holiday, is_exam_period
    from synthetic_data.generator import GenerationConfig, SyntheticDatasetGenerator, SLOT_DEFINITIONS
    from synthetic_data.models import SyntheticClub, SyntheticEvent
else:
    from backend.app.database import create_database_engine, make_session_factory
    from backend.app.feedback import AttendanceFeedback, EventFeedback, record_event_feedback
    from backend.app.models import Club, ClubMember, Event, User
    from backend.app.recommendations import recommend_for_club
    from backend.app.seed import seed_database
    from backend.synthetic_data.calendar import is_break_or_holiday, is_exam_period
    from backend.synthetic_data.generator import GenerationConfig, SyntheticDatasetGenerator, SLOT_DEFINITIONS
    from backend.synthetic_data.models import SyntheticClub, SyntheticEvent

SIMULATION_NAMESPACE = uuid.UUID("e0cc1040-4bf6-4b94-8e42-e5f859c55ebd")


def _slot_name(start: datetime) -> str:
    """Map arbitrary hourly candidate starts to their closest hidden-model slot."""
    return min(SLOT_DEFINITIONS, key=lambda item: abs((start.hour * 60 + start.minute) - (item["start_time"].hour * 60 + item["start_time"].minute)))["slot_name"]


def _synthetic_club(generator: SyntheticDatasetGenerator, db, club_id: str) -> SyntheticClub:
    """Map stored user ids to seeded hidden behavior personas for simulator use only."""
    base = next(club for club in generator.clubs if club.id == club_id)
    by_id = {member.id: member for member in base.members}
    users = db.execute(
        select(User, ClubMember.role).join(ClubMember, ClubMember.member_id == User.id)
        .where(ClubMember.club_id == club_id).order_by(User.id)
    ).all()
    persona_pool = sorted(base.members, key=lambda member: member.id)
    mapped = []
    for position, (user, role) in enumerate(users):
        member = by_id.get(user.id)
        if member is None:
            template = persona_pool[position % len(persona_pool)]
            member = replace(template, id=user.id, name=user.name, email=user.email, role=role, activity_tier="regular")
            generator.member_attended_count[user.id] = 0
        else:
            member.role = role
        mapped.append(member)
    return SyntheticClub(base.id, base.name, base.description, len(mapped), mapped)


def run_simulation(seed: int, rounds: int, output_path: str | Path, *, club_name: str = "ACM & Robotics Guild") -> list[dict[str, object]]:
    """Run temporal rounds in a disposable seeded DB and write deterministic CSV.

    Recommendations see only persisted observable history at each cursor. The
    attendance outcomes are sampled by SyntheticDatasetGenerator's hidden
    latent-persona, slot-affinity, calendar, fatigue, and seeded-noise model.
    """
    if rounds < 1:
        raise ValueError("Simulation rounds must be positive.")
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    config = GenerationConfig(seed=seed)
    behavior = SyntheticDatasetGenerator(config)
    behavior.generate_all()
    event_types = {event_type.id: event_type for event_type in behavior.event_types}
    cursor = config.end_date + timedelta(days=1)
    records: list[dict[str, object]] = []

    with tempfile.TemporaryDirectory(prefix="quorum-simulation-") as temp_dir:
        db_path = Path(temp_dir) / "simulation.db"
        seed_database(seed=seed, db_path=db_path)
        engine = create_database_engine(db_path)
        factory = make_session_factory(engine)
        with factory() as db:
            club = db.scalar(select(Club).where(Club.name == club_name))
            if club is None:
                raise ValueError(f"Unknown seeded simulation club: {club_name}")
            synthetic_club = _synthetic_club(behavior, db, club.id)
            existing_events = list(db.scalars(select(Event).where(Event.club_id == club.id).order_by(Event.start_time)))
            for round_index in range(rounds):
                recommendation_result = recommend_for_club(
                    db, club.id, strategy="average", top_n=1, quorum=5,
                    horizon_days=14, fairness=True, diversity=True, anchor_date=cursor,
                )
                if not recommendation_result["recommendations"]:
                    records.append({"round": round_index + 1, "event_type": "", "start": "", "mean_satisfaction": 0.0, "minimum_satisfaction": 0.0, "quorum_required": 5, "actual_attendance": 0, "quorum_success": False})
                    cursor += timedelta(days=7)
                    continue
                selected = recommendation_result["recommendations"][0]
                selected_start = datetime.fromisoformat(selected["start"])
                event_type = event_types[selected["event_type_id"]]
                event_id = str(uuid.uuid5(SIMULATION_NAMESPACE, f"{seed}:{club.id}:{round_index}:{selected['event_type_id']}:{selected['start']}"))
                event = Event(
                    id=event_id, club_id=club.id, event_type_id=event_type.id,
                    title=f"Simulation round {round_index + 1}: {event_type.name}",
                    start_time=selected_start, duration_minutes=int(selected["duration_minutes"]),
                    venue=selected["venue"], status="scheduled",
                )
                db.add(event)
                db.commit()
                synthetic_event = SyntheticEvent(
                    id=event_id, club_id=club.id, event_type_id=event_type.id,
                    title=event.title, start_time=selected_start,
                    duration_minutes=event.duration_minutes, venue=event.venue,
                    status="completed", slot_name=_slot_name(selected_start),
                    week_index=max(0, (selected_start.date() - config.start_date).days // 7),
                )
                fatigue = 1.0
                for prior in existing_events:
                    age = (selected_start.date() - prior.start_time.date()).days
                    if prior.event_type_id == event_type.id and 0 <= age < 21:
                        fatigue *= 0.65 if age < 10 else 0.80
                before = len(behavior.rsvps)
                behavior._simulate_attendance_for_event(
                    synthetic_event, event_type, synthetic_club,
                    synthetic_event.week_index, max(1, (config.end_date - config.start_date).days // 7),
                    fatigue, is_exam_period(selected_start.date()), is_break_or_holiday(selected_start.date()),
                )
                simulated_rsvps = behavior.rsvps[before:]
                feedback_items = [AttendanceFeedback(member_id=row.member_id, attended=row.attended, rating=row.rating) for row in simulated_rsvps]
                record_event_feedback(db, club.id, event_id, EventFeedback(attendees=feedback_items))
                attended_count = sum(row.attended for row in simulated_rsvps)
                satisfaction = [((row.rating - 1) / 4 if row.rating is not None else (0.6 if row.attended else 0.0)) for row in simulated_rsvps]
                quorum_required = int(selected["quorum_required"])
                records.append({
                    "round": round_index + 1,
                    "event_type": event_type.name,
                    "start": selected_start.isoformat(),
                    "mean_satisfaction": round(sum(satisfaction) / len(satisfaction), 4),
                    "minimum_satisfaction": round(min(satisfaction), 4),
                    "quorum_required": quorum_required,
                    "actual_attendance": attended_count,
                    "quorum_success": attended_count >= quorum_required,
                })
                existing_events.append(event)
                cursor = selected_start.date() + timedelta(days=1)
        engine.dispose()

    with output.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=["round", "event_type", "start", "mean_satisfaction", "minimum_satisfaction", "quorum_required", "actual_attendance", "quorum_success"])
        writer.writeheader()
        writer.writerows(records)
    return records
