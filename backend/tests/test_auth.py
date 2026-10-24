"""Integration tests for local login, session, CSRF, throttling, and roles."""

from __future__ import annotations

import hashlib
import os
from fastapi.testclient import TestClient
from sqlalchemy import inspect, select

from backend.app import main
from backend.app.database import create_database_engine, make_session_factory
from backend.app.models import Base, Club, LoginAttempt, Session as SessionRecord, User
from backend.app.security import hash_password, verify_password

ORGANIZER_PASSWORD = "QuorumOrganizer42!"
MEMBER_PASSWORD = "QuorumMember42!"


def test_new_password_hashes_use_argon2id_with_a_fresh_salt():
    first_hash = hash_password("A secure local password")
    second_hash = hash_password("A secure local password")
    assert first_hash.startswith("$argon2id$")
    assert second_hash.startswith("$argon2id$")
    assert first_hash != second_hash
    assert verify_password(first_hash, "A secure local password")


def _login(client: TestClient, email: str, password: str):
    csrf_response = client.get("/api/auth/csrf")
    assert csrf_response.status_code == 200
    csrf = csrf_response.json()["csrf_token"]
    return client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
        headers={"X-CSRF-Token": csrf},
    )


def _club_for_role(user_payload: dict, role: str) -> str:
    return next(club["id"] for club in user_payload["clubs"] if club["role"] == role)


def test_local_login_session_csrf_and_logout(seeded_database, tmp_path):
    db_path = tmp_path / "auth-session.db"
    seeded_database(db_path)
    old_path = os.environ.get("QUORUM_DB_PATH")
    os.environ["QUORUM_DB_PATH"] = str(db_path)
    try:
        with TestClient(main.app) as client:
            csrf_response = client.get("/api/auth/csrf")
            csrf = csrf_response.json()["csrf_token"]
            rejected = client.post(
                "/api/auth/login",
                json={"email": "organizer.acm@quorum.local", "password": ORGANIZER_PASSWORD},
                headers={"X-CSRF-Token": "wrong-token"},
            )
            assert rejected.status_code == 403

            response = client.post(
                "/api/auth/login",
                json={"email": "ORGANIZER.ACM@QUORUM.LOCAL", "password": ORGANIZER_PASSWORD},
                headers={"X-CSRF-Token": csrf},
            )
            assert response.status_code == 200
            assert response.json()["user"]["email"] == "organizer.acm@quorum.local"
            set_cookies = response.headers.get_list("set-cookie")
            session_cookie = next(value.lower() for value in set_cookies if value.startswith("quorum_session="))
            csrf_cookie = next(value.lower() for value in set_cookies if value.startswith("quorum_csrf="))
            assert "httponly" in session_cookie and "samesite=lax" in session_cookie
            assert "httponly" in csrf_cookie and "samesite=lax" in csrf_cookie

            raw_session = client.cookies.get("quorum_session")
            assert raw_session
            session_hash = hashlib.sha256(raw_session.encode("utf-8")).hexdigest()
            engine = create_database_engine(db_path)
            with make_session_factory(engine)() as session:
                persisted = session.get(SessionRecord, session_hash)
                assert persisted is not None
                assert persisted.id != raw_session
                assert persisted.csrf_token == response.json()["csrf_token"]
            engine.dispose()

            assert client.get("/api/auth/me").status_code == 200
            bad_logout = client.post("/api/auth/logout")
            assert bad_logout.status_code == 403
            logged_out = client.post(
                "/api/auth/logout",
                headers={"X-CSRF-Token": response.json()["csrf_token"]},
            )
            assert logged_out.status_code == 204
            assert client.get("/api/auth/me").status_code == 401
    finally:
        if old_path is None:
            os.environ.pop("QUORUM_DB_PATH", None)
        else:
            os.environ["QUORUM_DB_PATH"] = old_path


def test_password_hash_is_argon2id_and_club_roles_are_enforced(seeded_database, tmp_path):
    db_path = tmp_path / "auth-roles.db"
    seeded_database(db_path)
    old_path = os.environ.get("QUORUM_DB_PATH")
    os.environ["QUORUM_DB_PATH"] = str(db_path)
    try:
        with TestClient(main.app) as client:
            organizer_response = _login(client, "organizer.design@quorum.local", ORGANIZER_PASSWORD)
            assert organizer_response.status_code == 200
            organizer_user = organizer_response.json()["user"]
            organizer_club = _club_for_role(organizer_user, "organizer")
            members = client.get(f"/api/clubs/{organizer_club}/members")
            assert members.status_code == 200
            assert any(row["email"] == "member.design@quorum.local" for row in members.json())
            assert client.get(f"/api/clubs/{organizer_club}/events").status_code == 200

            client.cookies.clear()
            member_response = _login(client, "member.design@quorum.local", MEMBER_PASSWORD)
            assert member_response.status_code == 200
            member_user = member_response.json()["user"]
            member_club = _club_for_role(member_user, "member")
            assert client.get(f"/api/clubs/{member_club}/events").status_code == 200
            assert client.get(f"/api/clubs/{member_club}/members").status_code == 403
            engine = create_database_engine(db_path)
            with make_session_factory(engine)() as session:
                foreign_club = session.scalar(select(Club.id).where(Club.id != member_club).order_by(Club.id))
            engine.dispose()
            assert foreign_club is not None
            assert client.get(f"/api/clubs/{foreign_club}/events").status_code == 403

        engine = create_database_engine(db_path)
        with make_session_factory(engine)() as session:
            organizer = session.scalar(select(User).where(User.email == "organizer.design@quorum.local"))
            assert organizer is not None and organizer.password_hash is not None
            assert organizer.password_hash.startswith("$argon2id$")
            assert verify_password(organizer.password_hash, ORGANIZER_PASSWORD)
        engine.dispose()
    finally:
        if old_path is None:
            os.environ.pop("QUORUM_DB_PATH", None)
        else:
            os.environ["QUORUM_DB_PATH"] = old_path


def test_invalid_passwords_are_throttled_in_sqlite(seeded_database, tmp_path):
    db_path = tmp_path / "auth-throttle.db"
    seeded_database(db_path)
    old_path = os.environ.get("QUORUM_DB_PATH")
    os.environ["QUORUM_DB_PATH"] = str(db_path)
    try:
        with TestClient(main.app, client=("192.0.2.44", 4312)) as client:
            csrf = client.get("/api/auth/csrf").json()["csrf_token"]
            for _ in range(5):
                response = client.post(
                    "/api/auth/login",
                    json={"email": "organizer.ai-data@quorum.local", "password": "incorrect"},
                    headers={"X-CSRF-Token": csrf},
                )
                assert response.status_code == 401
            blocked = client.post(
                "/api/auth/login",
                json={"email": "organizer.ai-data@quorum.local", "password": ORGANIZER_PASSWORD},
                headers={"X-CSRF-Token": csrf},
            )
            assert blocked.status_code == 429
            assert int(blocked.headers["retry-after"]) > 0

        engine = create_database_engine(db_path)
        with make_session_factory(engine)() as session:
            rows = list(session.scalars(select(LoginAttempt)))
            assert len(rows) == 2
            assert all(len(row.identifier_hash) == 64 for row in rows)
            assert all("organizer.ai-data" not in row.identifier_hash for row in rows)
        engine.dispose()
    finally:
        if old_path is None:
            os.environ.pop("QUORUM_DB_PATH", None)
        else:
            os.environ["QUORUM_DB_PATH"] = old_path


def test_startup_adds_auth_schema_to_an_existing_local_database(tmp_path):
    db_path = tmp_path / "pre-auth.db"
    engine = create_database_engine(db_path)
    prior_tables = [table for table in Base.metadata.sorted_tables if table.name != "login_attempts"]
    Base.metadata.create_all(engine, tables=prior_tables)
    engine.dispose()

    old_path = os.environ.get("QUORUM_DB_PATH")
    os.environ["QUORUM_DB_PATH"] = str(db_path)
    try:
        with TestClient(main.app):
            pass
        engine = create_database_engine(db_path)
        assert "login_attempts" in inspect(engine).get_table_names()
        engine.dispose()
    finally:
        if old_path is None:
            os.environ.pop("QUORUM_DB_PATH", None)
        else:
            os.environ["QUORUM_DB_PATH"] = old_path
