"""Local password login, server-side sessions, and CSRF-protected logout."""

from __future__ import annotations

from datetime import timedelta
import os
import secrets
import hashlib

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import delete
from sqlalchemy.orm import Session as OrmSession

from .dependencies import (
    AuthContext,
    CSRF_COOKIE,
    SESSION_COOKIE,
    _session_by_cookie,
    get_auth_context,
    get_db,
    require_csrf,
)
from .models import Session as SessionRecord, User, utc_now
from .security import PASSWORD_HASHER, verify_password
from .throttle import (
    active_lockout_until,
    clear_login_failures,
    login_identifiers,
    purge_expired_attempts,
    record_login_failure,
)
from sqlalchemy import select

SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
COOKIE_SECURE = os.environ.get("QUORUM_COOKIE_SECURE", "false").strip().lower() in {"1", "true", "yes"}
DUMMY_PASSWORD_HASH = PASSWORD_HASHER.hash(
    "Quorum authentication timing sentinel",
    salt=hashlib.sha256(b"quorum-invalid-login-sentinel").digest()[:16],
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])


class LoginRequest(BaseModel):
    """Validated credentials for a local demo account."""

    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email_shape(cls, value: str) -> str:
        normalized = value.strip().lower()
        local, separator, domain = normalized.partition("@")
        if not separator or not local or "." not in domain or any(char.isspace() for char in normalized):
            raise ValueError("Enter a valid email address.")
        return normalized


def _set_auth_cookies(response: Response, raw_session: str, csrf_token: str) -> None:
    """Set local-only session and CSRF cookies with browser protections."""
    response.set_cookie(
        SESSION_COOKIE,
        raw_session,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        CSRF_COOKIE,
        csrf_token,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def _user_payload(user: User, db: OrmSession) -> dict[str, object]:
    """Return the authenticated user's public profile and club roles."""
    from .models import Club, ClubMember

    memberships = db.execute(
        select(Club.id, Club.name, ClubMember.role)
        .join(ClubMember, ClubMember.club_id == Club.id)
        .where(ClubMember.member_id == user.id)
        .order_by(Club.id)
    ).all()
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "clubs": [
            {"id": club_id, "name": name, "role": role}
            for club_id, name, role in memberships
        ],
    }


@router.get("/csrf")
def csrf_token(
    request: Request,
    response: Response,
    db: OrmSession = Depends(get_db),
) -> dict[str, str]:
    """Issue a same-origin token for login, or restore the active session token."""
    response.headers["Cache-Control"] = "no-store"
    active_session = _session_by_cookie(request.cookies.get(SESSION_COOKIE), db)
    token = active_session.csrf_token if active_session is not None else secrets.token_urlsafe(32)
    response.set_cookie(
        CSRF_COOKIE,
        token,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {"csrf_token": token}


@router.post("/login")
def login(
    credentials: LoginRequest,
    request: Request,
    response: Response,
    csrf_header: str | None = Header(default=None, alias="X-CSRF-Token"),
    db: OrmSession = Depends(get_db),
) -> dict[str, object]:
    """Verify credentials, throttle failures, rotate CSRF, and create a DB session."""
    response.headers["Cache-Control"] = "no-store"
    csrf_cookie = request.cookies.get(CSRF_COOKIE)
    if (
        not csrf_header
        or not csrf_cookie
        or not secrets.compare_digest(csrf_header, csrf_cookie)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed.")

    email = credentials.email
    client_host = request.client.host if request.client is not None else "unknown"
    identifiers = login_identifiers(email, client_host)
    now = utc_now()
    purge_expired_attempts(db, now)
    locked_until = active_lockout_until(db, identifiers, now)
    if locked_until is not None:
        retry_after = max(1, int((locked_until - now).total_seconds()))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
            headers={"Retry-After": str(retry_after)},
        )

    user = db.scalar(select(User).where(User.email == email))
    hash_to_check = user.password_hash if user is not None and user.password_hash else DUMMY_PASSWORD_HASH
    valid_password = verify_password(hash_to_check, credentials.password)
    if user is None or not valid_password:
        record_login_failure(db, identifiers, now)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    clear_login_failures(db, identifiers)
    db.execute(delete(SessionRecord).where(SessionRecord.expires_at <= now))
    raw_session = secrets.token_urlsafe(32)
    csrf_value = secrets.token_urlsafe(32)
    session_row = SessionRecord(
        id=hashlib.sha256(raw_session.encode("utf-8")).hexdigest(),
        user_id=user.id,
        csrf_token=csrf_value,
        created_at=now,
        expires_at=now + timedelta(seconds=SESSION_TTL_SECONDS),
    )
    db.add(session_row)
    db.commit()
    _set_auth_cookies(response, raw_session, csrf_value)
    return {"user": _user_payload(user, db), "csrf_token": csrf_value}


@router.get("/me")
def current_user(
    response: Response,
    auth: AuthContext = Depends(get_auth_context),
    db: OrmSession = Depends(get_db),
) -> dict[str, object]:
    """Return the current authenticated profile and club roles."""
    response.headers["Cache-Control"] = "no-store"
    return _user_payload(auth.user, db)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    auth: AuthContext = Depends(require_csrf),
    db: OrmSession = Depends(get_db),
) -> Response:
    """Revoke the server-side session after validating its CSRF token."""
    db.delete(auth.session)
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    response.delete_cookie(SESSION_COOKIE, path="/", httponly=True, secure=COOKIE_SECURE, samesite="lax")
    response.delete_cookie(CSRF_COOKIE, path="/", httponly=True, secure=COOKIE_SECURE, samesite="lax")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
