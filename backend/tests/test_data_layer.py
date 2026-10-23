"""Acceptance tests for the SQLite schema, repositories, and deterministic seed."""

import ast
import asyncio
from pathlib import Path

from sqlalchemy import inspect, select, text
from sqlalchemy.exc import IntegrityError
import pytest

from backend.app import main
from backend.app.database import create_database_engine, make_session_factory
from backend.app.models import (
    Base,
    Club,
    ClubMember,
    Event,
    User,
)
from backend.app.repositories import get_club_members, get_user_by_email, list_events
from backend.app.seed import seed_database


def _snapshot(engine) -> dict[str, list[tuple[object, ...]]]:
    """Read every persisted row in primary-key order for deterministic comparisons."""
    result: dict[str, list[tuple[object, ...]]] = {}
    with engine.connect() as connection:
        for table in sorted(Base.metadata.sorted_tables, key=lambda item: item.name):
            rows = connection.execute(select(table).order_by(*table.primary_key.columns)).all()
            result[table.name] = [tuple(row) for row in rows]
    return result


def test_schema_has_required_tables_constraints_and_indexes(tmp_path):
    engine = create_database_engine(tmp_path / "schema.db")
    Base.metadata.create_all(engine)
    inspector = inspect(engine)
    required = {
        "users", "clubs", "club_members", "event_types", "events", "rsvps",
        "preferences", "availability", "academic_calendar", "fairness_ledger", "sessions",
    }
    assert required.issubset(set(inspector.get_table_names()))
    for table_name in required:
        assert inspector.get_foreign_keys(table_name) or table_name in {"users", "clubs", "event_types"}
    assert inspector.get_pk_constraint("club_members")["constrained_columns"] == ["club_id", "member_id"]
    assert inspector.get_check_constraints("events")
    assert inspector.get_check_constraints("rsvps")
    assert inspector.get_check_constraints("preferences")
    assert inspector.get_indexes("events")
    assert any(index["unique"] for index in inspector.get_indexes("users"))
    engine.dispose()


def test_sqlite_pragmas_and_foreign_key_enforcement(tmp_path):
    engine = create_database_engine(tmp_path / "pragmas.db")
    Base.metadata.create_all(engine)
    with engine.connect() as connection:
        assert connection.scalar(text("PRAGMA foreign_keys")) == 1
        assert connection.scalar(text("PRAGMA journal_mode")) == "wal"
        assert connection.scalar(text("PRAGMA busy_timeout")) == 5000
    factory = make_session_factory(engine)
    with pytest.raises(IntegrityError):
        with factory.begin() as session:
            session.add(ClubMember(club_id="missing-club", member_id="missing-user", role="member"))
    with factory.begin() as session:
        session.add_all([User(id="user-1", name="Member", email="member@example.test"), Club(id="club-1", name="Club")])
    with pytest.raises(IntegrityError):
        with factory.begin() as session:
            session.add(ClubMember(club_id="club-1", member_id="user-1", role="administrator"))
    engine.dispose()


def test_seed_rebuild_is_deterministic_and_repositories_bind_values(tmp_path):
    db = tmp_path / "seed.db"
    counts = seed_database(seed=42, db_path=db)
    first_engine = create_database_engine(db)
    first = _snapshot(first_engine)
    assert counts["clubs"] == 3
    assert counts["users"] in range(75, 181)
    assert counts["event_types"] == 12
    assert counts["events"] > 100
    assert counts["rsvps"] > 1000
    assert counts["academic_calendar"] > 0
    with make_session_factory(first_engine)() as session:
        assert get_user_by_email(session, "' OR 1=1 --") is None
        assert list_events(session, "' OR 1=1 --") == []
        club_id = session.scalar(select(Club.id).order_by(Club.id))
        assert club_id is not None
        members = get_club_members(session, club_id)
        assert 25 <= len(members) <= 60
        event_times = list(session.scalars(select(Event.start_time)))
        assert (max(event_times) - min(event_times)).days >= 500
    first_engine.dispose()

    repeated_counts = seed_database(seed=42, db_path=db)
    second_engine = create_database_engine(db)
    assert repeated_counts == counts
    assert _snapshot(second_engine) == first
    second_engine.dispose()


def test_missing_database_is_seeded_on_server_startup(tmp_path, monkeypatch):
    db = tmp_path / "startup.db"
    monkeypatch.setenv("QUORUM_DB_PATH", str(db))
    monkeypatch.setenv("QUORUM_SEED", "42")
    assert not db.exists()

    async def start_server_lifespan():
        async with main.app.router.lifespan_context(main.app):
            assert db.is_file()

    asyncio.run(start_server_lifespan())
    assert db.is_file()
    engine = create_database_engine(db)
    assert inspect(engine).has_table("events")
    engine.dispose()


def test_recommender_source_cannot_reference_generator_latent_fields():
    """Guard the feature boundary by rejecting hidden generation fields in recsys code."""
    recsys_dir = Path(__file__).resolve().parents[1] / "recsys"
    forbidden = {
        "latent", "persona", "drift_target", "is_drifting", "activity_tier",
        "slot_affinities", "fatigue_factor", "content_affinity",
    }
    database_columns = {
        column.name.lower()
        for table in Base.metadata.tables.values()
        for column in table.columns
    }
    leaked_columns = sorted(name for name in database_columns if any(term in name for term in forbidden))
    assert not leaked_columns, f"Database schema includes hidden generator fields: {leaked_columns}"
    for source_path in sorted(recsys_dir.rglob("*.py")):
        tree = ast.parse(source_path.read_text(encoding="utf-8"), filename=str(source_path))
        observed: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Name):
                observed.add(node.id.lower())
            elif isinstance(node, ast.Attribute):
                observed.add(node.attr.lower())
            elif isinstance(node, ast.Constant) and isinstance(node.value, str):
                observed.add(node.value.lower())
        leaking = sorted(name for name in observed if any(term in name for term in forbidden))
        assert not leaking, f"{source_path} references hidden generator fields: {leaking}"
