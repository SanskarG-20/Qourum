"""SQLite engine and schema setup with required connection pragmas."""

from __future__ import annotations

import os
from pathlib import Path
import sqlite3

from sqlalchemy import Engine, create_engine, event
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
    """Create all mapped tables and indexes when they do not exist."""
    Base.metadata.create_all(engine)


def make_session_factory(engine: Engine) -> sessionmaker[OrmSession]:
    """Return a session factory that does not expire loaded values after commit."""
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
