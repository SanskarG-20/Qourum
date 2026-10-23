"""SQLite-backed login throttling with hashed email and client identifiers."""

from __future__ import annotations

from datetime import datetime, timedelta
import hashlib

from sqlalchemy import case, delete, or_, select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from .models import LoginAttempt

MAX_FAILURES = 5
WINDOW = timedelta(minutes=15)
LOCKOUT = timedelta(minutes=15)


def _identifier_hash(kind: str, value: str) -> str:
    """Hash a login identifier so throttle rows never store raw email or IP data."""
    return hashlib.sha256(f"{kind}:{value}".encode("utf-8")).hexdigest()


def login_identifiers(email: str, client_host: str) -> tuple[str, str]:
    """Return the normalized email and client address throttle keys."""
    return _identifier_hash("email", email.strip().lower()), _identifier_hash("client", client_host)


def active_lockout_until(db: Session, identifiers: tuple[str, str], now: datetime) -> datetime | None:
    """Return the latest active lockout across email and client address keys."""
    rows = db.scalars(select(LoginAttempt).where(LoginAttempt.identifier_hash.in_(identifiers))).all()
    lockouts = [row.locked_until for row in rows if row.locked_until is not None and row.locked_until > now]
    return max(lockouts) if lockouts else None


def purge_expired_attempts(db: Session, now: datetime) -> None:
    """Prune throttle rows whose observation window and lockout have both expired."""
    db.execute(
        delete(LoginAttempt).where(
            LoginAttempt.window_started < now - WINDOW,
            or_(LoginAttempt.locked_until.is_(None), LoginAttempt.locked_until <= now),
        )
    )


def record_login_failure(db: Session, identifiers: tuple[str, str], now: datetime) -> None:
    """Atomically increment each throttle key and lock it after the fifth failure."""
    cutoff = now - WINDOW
    lock_until = now + LOCKOUT
    for identifier in identifiers:
        statement = sqlite_insert(LoginAttempt).values(
            identifier_hash=identifier,
            failures=1,
            window_started=now,
            locked_until=None,
        )
        statement = statement.on_conflict_do_update(
            index_elements=[LoginAttempt.identifier_hash],
            set_={
                "failures": case(
                    (LoginAttempt.window_started < cutoff, 1),
                    else_=LoginAttempt.failures + 1,
                ),
                "window_started": case(
                    (LoginAttempt.window_started < cutoff, now),
                    else_=LoginAttempt.window_started,
                ),
                "locked_until": case(
                    (LoginAttempt.window_started < cutoff, None),
                    (LoginAttempt.failures + 1 >= MAX_FAILURES, lock_until),
                    else_=LoginAttempt.locked_until,
                ),
            },
        )
        db.execute(statement)


def clear_login_failures(db: Session, identifiers: tuple[str, str]) -> None:
    """Clear relevant failures after a successful authentication."""
    db.execute(delete(LoginAttempt).where(LoginAttempt.identifier_hash.in_(identifiers)))
