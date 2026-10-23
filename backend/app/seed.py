"""Rebuild the local SQLite database from a deterministic synthetic dataset."""

from __future__ import annotations

import argparse
from datetime import datetime
import os
from pathlib import Path
import uuid

import pandas as pd
from sqlalchemy import func, select

from .database import (
    create_database_engine,
    database_path,
    initialize_schema,
    make_session_factory,
)
from .models import (
    AcademicCalendar,
    Availability,
    Club,
    ClubMember,
    Event,
    EventType,
    Preference,
    RSVP,
    User,
)
if __package__ == "app" or __package__.startswith("app."):
    from synthetic_data.calendar import ACADEMIC_CALENDAR_PERIODS
    from synthetic_data.exporter import export_feature_datasets
    from synthetic_data.generator import GenerationConfig, SyntheticDatasetGenerator
else:
    from backend.synthetic_data.calendar import ACADEMIC_CALENDAR_PERIODS
    from backend.synthetic_data.exporter import export_feature_datasets
    from backend.synthetic_data.generator import GenerationConfig, SyntheticDatasetGenerator

SEED_NAMESPACE = uuid.UUID("a1f2a729-9b16-48ad-9f74-c8edb939d6a5")


def _calendar_id(name: str, start_date: str) -> str:
    """Create a stable identifier for a fixed synthetic academic period."""
    return str(uuid.uuid5(SEED_NAMESPACE, f"calendar:{name}:{start_date}"))


def _optional(value: object) -> object | None:
    """Normalize pandas missing scalars to Python None for nullable columns."""
    return None if pd.isna(value) else value


def seed_database(seed: int | None = None, db_path: str | Path | None = None) -> dict[str, int]:
    """Rebuild the database and return inserted row counts by table."""
    selected_seed = int(os.environ.get("QUORUM_SEED", "42")) if seed is None else seed
    selected_path = Path(db_path) if db_path is not None else database_path()
    if str(selected_path) != ":memory:":
        selected_path = selected_path.resolve()
        selected_path.parent.mkdir(parents=True, exist_ok=True)
        for suffix in ("", "-wal", "-shm"):
            target = Path(f"{selected_path}{suffix}")
            if target.exists():
                target.unlink()

    generator = SyntheticDatasetGenerator(GenerationConfig(seed=selected_seed))
    generator.generate_all()
    tables = export_feature_datasets(generator)

    engine = create_database_engine(selected_path)
    initialize_schema(engine)
    SessionFactory = make_session_factory(engine)
    try:
        with SessionFactory.begin() as session:
            session.add_all(
                Club(id=row.id, name=row.name, description=row.description)
                for row in tables["clubs"].itertuples(index=False)
            )
            session.add_all(
                User(id=row.id, name=row.name, email=row.email.lower())
                for row in tables["members"].itertuples(index=False)
            )
            session.add_all(
                EventType(
                    id=row.id,
                    name=row.name,
                    category=row.category,
                    description=row.description,
                    default_duration_minutes=int(row.default_duration_minutes),
                )
                for row in tables["event_types"].itertuples(index=False)
            )
            session.flush()
            session.add_all(
                ClubMember(club_id=row.club_id, member_id=row.member_id, role=row.role)
                for row in tables["club_members"].itertuples(index=False)
            )
            session.add_all(
                Event(
                    id=row.id,
                    club_id=row.club_id,
                    event_type_id=row.event_type_id,
                    title=row.title,
                    start_time=datetime.fromisoformat(row.start_time),
                    duration_minutes=int(row.duration_minutes),
                    venue=row.venue,
                    status=row.status,
                )
                for row in tables["events"].itertuples(index=False)
            )
            session.add_all(
                Preference(
                    id=row.id,
                    member_id=row.member_id,
                    event_type_id=row.event_type_id,
                    rating=int(row.rating),
                )
                for row in tables["preferences"].itertuples(index=False)
            )
            session.add_all(
                Availability(
                    id=row.id,
                    member_id=row.member_id,
                    day_of_week=None if _optional(row.day_of_week) is None else int(row.day_of_week),
                    specific_date=None if _optional(row.specific_date) is None else datetime.fromisoformat(row.specific_date).date(),
                    start_time=datetime.strptime(row.start_time, "%H:%M:%S").time(),
                    end_time=datetime.strptime(row.end_time, "%H:%M:%S").time(),
                    is_available=bool(row.is_available),
                )
                for row in tables["availability"].itertuples(index=False)
            )
            session.add_all(
                AcademicCalendar(
                    id=_calendar_id(period.name, period.start_date.isoformat()),
                    club_id=None,
                    name=period.name,
                    period_type=period.period_type,
                    start_date=period.start_date,
                    end_date=period.end_date,
                    description=period.description,
                )
                for period in ACADEMIC_CALENDAR_PERIODS
            )
            session.flush()
            session.add_all(
                RSVP(
                    id=row.id,
                    event_id=row.event_id,
                    member_id=row.member_id,
                    status=row.rsvp_status,
                    attended=bool(row.attended),
                    rating=None if _optional(row.rating) is None else int(row.rating),
                    feedback=_optional(row.feedback),
                )
                for row in tables["rsvps"].itertuples(index=False)
            )
            session.flush()
            counts = {
                model.__tablename__: int(session.scalar(select(func.count()).select_from(model)) or 0)
                for model in (Club, User, ClubMember, EventType, Event, RSVP, Preference, Availability, AcademicCalendar)
            }
    finally:
        engine.dispose()
    return counts


def main() -> None:
    """Parse seed options and rebuild the configured local database."""
    parser = argparse.ArgumentParser(description="Rebuild the local Quorum database with synthetic data")
    parser.add_argument("--seed", type=int, default=int(os.environ.get("QUORUM_SEED", "42")))
    parser.add_argument("--db", type=Path, default=database_path())
    args = parser.parse_args()
    counts = seed_database(seed=args.seed, db_path=args.db)
    print(f"Seeded {args.db} (seed={args.seed})")
    for table, count in counts.items():
        print(f"{table}: {count}")


if __name__ == "__main__":
    main()
