"""P11 event acceptance, RSVP, and role boundaries."""

import os
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.app.database import create_database_engine, make_session_factory
from backend.app.main import app
from backend.app.models import EventType, utc_now
from backend.app.seed import DEMO_PASSWORDS, seed_database


def _login(client: TestClient, email: str, password: str) -> dict:
    csrf = client.get("/api/auth/csrf").json()["csrf_token"]
    response = client.post("/api/auth/login", json={"email": email, "password": password}, headers={"X-CSRF-Token": csrf})
    assert response.status_code == 200
    return response.json()


def test_organizer_accepts_slot_and_member_rsvps(tmp_path):
    database = tmp_path / "event-workflow.db"
    seed_database(seed=42, db_path=database)
    engine = create_database_engine(database)
    with make_session_factory(engine)() as db:
        event_type_id = db.scalar(select(EventType.id).order_by(EventType.id))
    engine.dispose()
    old_path = os.environ.get("QUORUM_DB_PATH")
    os.environ["QUORUM_DB_PATH"] = str(database)
    try:
        with TestClient(app) as client:
            organizer = _login(client, "organizer.acm@quorum.local", DEMO_PASSWORDS["organizer"])
            club_id = organizer["user"]["clubs"][0]["id"]
            csrf = client.get("/api/auth/csrf").json()["csrf_token"]
            start = (utc_now() + timedelta(days=10)).replace(minute=0, second=0, microsecond=0).isoformat()
            response = client.post(f"/api/clubs/{club_id}/events", json={"event_type_id": event_type_id, "start_time": start, "venue": "Local Club Room"}, headers={"X-CSRF-Token": csrf})
            assert response.status_code == 200
            event = response.json()
            assert event["status"] == "scheduled"
            assert event["description"]
            conflict = client.post(f"/api/clubs/{club_id}/events", json={"event_type_id": event_type_id, "start_time": start, "venue": "Another Room"}, headers={"X-CSRF-Token": csrf})
            assert conflict.status_code == 409

            client.cookies.clear()
            member = _login(client, "member.acm@quorum.local", DEMO_PASSWORDS["member"])
            member_club = member["user"]["clubs"][0]["id"]
            member_csrf = client.get("/api/auth/csrf").json()["csrf_token"]
            rsvp = client.post(f"/api/clubs/{member_club}/events/{event['id']}/rsvp", json={"status": "yes"}, headers={"X-CSRF-Token": member_csrf})
            assert rsvp.status_code == 200
            changed = client.post(f"/api/clubs/{member_club}/events/{event['id']}/rsvp", json={"status": "maybe"}, headers={"X-CSRF-Token": member_csrf})
            assert changed.status_code == 200 and changed.json()["status"] == "maybe"
            forbidden = client.post(f"/api/clubs/{member_club}/events", json={"event_type_id": event_type_id, "start_time": (utc_now() + timedelta(days=11)).replace(minute=0, second=0, microsecond=0).isoformat(), "venue": "Local Club Room"}, headers={"X-CSRF-Token": member_csrf})
            assert forbidden.status_code == 403
            events = client.get(f"/api/clubs/{member_club}/events").json()
            accepted = next(item for item in events if item["id"] == event["id"])
            assert accepted["my_rsvp"] == "maybe"
    finally:
        if old_path is None:
            os.environ.pop("QUORUM_DB_PATH", None)
        else:
            os.environ["QUORUM_DB_PATH"] = old_path
