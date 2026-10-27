"""SQLite engine and schema setup with required connection pragmas."""

from __future__ import annotations

import os
from pathlib import Path
import sqlite3

from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.orm import Session as OrmSession, sessionmaker

from .models import Base

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_PATH = REPOSITORY_ROOT / "data" / "quorum.db"


def database_path(path: str | Path | None = None) -> Path:
    """Resolve a configured database path against the repository root."""
    configured = Path(path or os.environ.get("QUORUM_DB_PATH", DEFAULT_DATABASE_PATH))
    return configured if configured.is_absolute() else REPOSITORY_ROOT / configured


def create_database_engine(path: str | Path | None = None) -> Engine:
    """Create a SQLite engine and apply foreign-key, WAL, and timeout settings."""
    selected = str(path) if str(path) == ":memory:" else database_path(path)
    if selected != ":memory:":
        Path(selected).parent.mkdir(parents=True, exist_ok=True)
        url = f"sqlite+pysqlite:///{Path(selected).as_posix()}"
    else:
        url = "sqlite+pysqlite:///:memory:"
    engine = create_engine(url, connect_args={"timeout": 5.0, "check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _apply_sqlite_pragmas(dbapi_connection: sqlite3.Connection, _connection_record: object) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

    return engine


def initialize_schema(engine: Engine) -> None:
    """Create mapped objects and apply idempotent additive SQLite upgrades."""
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        columns = {row[1] for row in connection.execute(text("PRAGMA table_info(events)"))}
        if "description" not in columns:
            connection.execute(text("ALTER TABLE events ADD COLUMN description TEXT NOT NULL DEFAULT ''"))
        if "event_format_id" not in columns:
            connection.execute(text("ALTER TABLE events ADD COLUMN event_format_id VARCHAR(64)"))
        if "delivery_mode" not in columns:
            connection.execute(text("ALTER TABLE events ADD COLUMN delivery_mode VARCHAR(20)"))
        if "estimated_fee_inr" not in columns:
            connection.execute(text("ALTER TABLE events ADD COLUMN estimated_fee_inr INTEGER"))
        if "planning_snapshot" not in columns:
            connection.execute(text("ALTER TABLE events ADD COLUMN planning_snapshot JSON"))
        settings_columns = {row[1] for row in connection.execute(text("PRAGMA table_info(member_settings)"))}
        if "max_fee_inr" not in settings_columns:
            connection.execute(text("ALTER TABLE member_settings ADD COLUMN max_fee_inr INTEGER CHECK(max_fee_inr IS NULL OR max_fee_inr >= 0)"))
        if "mode_preference" not in settings_columns:
            connection.execute(text("ALTER TABLE member_settings ADD COLUMN mode_preference VARCHAR(16) CHECK(mode_preference IS NULL OR mode_preference IN ('in_person', 'online', 'either'))"))
        connection.execute(text(
            "UPDATE events SET description = COALESCE((SELECT description FROM event_types "
            "WHERE event_types.id = events.event_type_id), '') WHERE description = ''"
        ))
    # SQLite cannot drop NOT NULL directly. Rebuild the table while keeping
    # dependent RSVP foreign keys pointed at the stable `events` table name.
    with engine.connect() as connection:
        venue_info = next((row for row in connection.execute(text("PRAGMA table_info(events)")) if row[1] == "venue"), None)
    if venue_info is not None and venue_info[3]:
        raw = engine.raw_connection()
        try:
            raw.execute("PRAGMA foreign_keys=OFF")
            raw.execute("BEGIN IMMEDIATE")
            raw.execute("""
                CREATE TABLE events_optional_venue (
                    id VARCHAR(36) NOT NULL PRIMARY KEY,
                    club_id VARCHAR(36) NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
                    event_type_id VARCHAR(36) NOT NULL REFERENCES event_types(id) ON DELETE RESTRICT,
                    title VARCHAR(200) NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    start_time DATETIME NOT NULL,
                    duration_minutes INTEGER NOT NULL CHECK(duration_minutes > 0),
                    venue VARCHAR(200),
                    event_format_id VARCHAR(64),
                    delivery_mode VARCHAR(20) CHECK(delivery_mode IS NULL OR delivery_mode IN ('in_person', 'online')),
                    estimated_fee_inr INTEGER CHECK(estimated_fee_inr IS NULL OR estimated_fee_inr >= 0),
                    planning_snapshot JSON,
                    status VARCHAR(16) NOT NULL CHECK(status IN ('proposed', 'scheduled', 'completed', 'cancelled'))
                )
            """)
            raw.execute("""
                INSERT INTO events_optional_venue
                (id, club_id, event_type_id, title, description, start_time, duration_minutes,
                 venue, event_format_id, delivery_mode, estimated_fee_inr, planning_snapshot, status)
                SELECT id, club_id, event_type_id, title, description, start_time, duration_minutes,
                       NULLIF(venue, ''), event_format_id, delivery_mode, estimated_fee_inr, planning_snapshot, status
                FROM events
            """)
            raw.execute("DROP TABLE events")
            raw.execute("ALTER TABLE events_optional_venue RENAME TO events")
            raw.execute("CREATE INDEX ix_events_club_start ON events(club_id, start_time)")
            raw.execute("CREATE INDEX ix_events_type_start ON events(event_type_id, start_time)")
            raw.commit()
            raw.execute("PRAGMA foreign_keys=ON")
        except Exception:
            raw.rollback()
            raw.execute("PRAGMA foreign_keys=ON")
            raise
        finally:
            raw.close()


def make_session_factory(engine: Engine) -> sessionmaker[OrmSession]:
    """Return a session factory that does not expire loaded values after commit."""
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
