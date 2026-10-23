"""FastAPI dependencies for local sessions and per-club authorization."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
import hashlib
import secrets
from typing import Callable, Iterator

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import Engine
from sqlalchemy.orm import Session as OrmSession

from .database import create_database_engine, database_path, make_session_factory
from .models import ClubMember, Session as SessionRecord, User

SESSION_COOKIE = "quorum_session"
CSRF_COOKIE = "quorum_csrf"


@lru_cache(maxsize=16)
def _engine_for_path(path: str) -> Engine:
    """Cache one pooled SQLite engine per configured database path."""
    return create_database_engine(path)


def get_db() -> Iterator[OrmSession]:
    """Provide a transaction-capable SQLAlchemy session for one request."""
    engine = _engine_for_path(str(database_path()))
    factory = make_session_factory(engine)
    with factory() as session:
        yield session


@dataclass(frozen=True)
class AuthContext:
    """Authenticated user and their server-side session row."""

    user: User
    session: SessionRecord


@dataclass(frozen=True)
class ClubAccess:
    """Authenticated user together with a club-scoped role."""

    user: User
    club_id: str
    role: str


def _session_by_cookie(raw_token: str | None, db: OrmSession) -> SessionRecord | None:
    """Find an unexpired session by hashing its opaque browser token."""
    if not raw_token:
        return None
    identifier_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    record = db.get(SessionRecord, identifier_hash)
    if record is None:
        return None
    if record.expires_at <= datetime.utcnow():
        db.delete(record)
        db.commit()
        return None
    return record


def get_auth_context(
    request: Request,
    db: OrmSession = Depends(get_db),
) -> AuthContext:
    """Authenticate an HttpOnly session cookie or return 401."""
    record = _session_by_cookie(request.cookies.get(SESSION_COOKIE), db)
    if record is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    user = db.get(User, record.user_id)
    if user is None:
        db.delete(record)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return AuthContext(user=user, session=record)


def require_csrf(
    request: Request,
    auth: AuthContext = Depends(get_auth_context),
) -> AuthContext:
    """Require matching session, CSRF cookie, and X-CSRF-Token values."""
    header_token = request.headers.get("X-CSRF-Token")
    cookie_token = request.cookies.get(CSRF_COOKIE)
    if (
        not header_token
        or not cookie_token
        or not secrets.compare_digest(header_token, auth.session.csrf_token)
        or not secrets.compare_digest(cookie_token, auth.session.csrf_token)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed.")
    return auth


def require_club_role(*allowed_roles: str) -> Callable[..., ClubAccess]:
    """Build a dependency enforcing membership and an allowed club role."""
    allowed = frozenset(allowed_roles)

    def dependency(
        club_id: str,
        auth: AuthContext = Depends(get_auth_context),
        db: OrmSession = Depends(get_db),
    ) -> ClubAccess:
        membership = db.get(ClubMember, {"club_id": club_id, "member_id": auth.user.id})
        if membership is None or membership.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient club permissions.")
        return ClubAccess(user=auth.user, club_id=club_id, role=membership.role)

    return dependency


require_club_member = require_club_role("organizer", "member")
require_club_organizer = require_club_role("organizer")
