"""Attendance feedback persistence, authorization, and temporal evidence tests."""

import os
from datetime import date, datetime, time, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.app.database import create_database_engine, make_session_factory
from backend.app.main import app
from backend.app.models import Club, ClubMember, Event, EventType, FairnessLedger, RSVP
from backend.app.seed import DEMO_PASSWORDS, seed_database
from backend.app.recommendations import load_attendance_rows_before, load_fairness_records_before


def _login(client: TestClient, email: str, password: str) -> dict:
    csrf = client.get("/api/auth/csrf").json()["csrf_token"]
    response = client.post("/api/auth/login", json={"email": email, "password": password}, headers={"X-CSRF-Token": csrf})
    assert response.status_code == 200
    return response.json()


def test_feedback_updates_attendance_and_fairness_and_rejects_future_events(tmp_path):
    database = tmp_path / "feedback.db"
    seed_database(seed=42, db_path=database)
    engine = create_database_engine(database)
    with make_session_factory(engine)() as db:
        club_id = db.scalar(select(Club.id).where(Club.name.like("ACM%")))
        event = db.scalar(select(Event).where(Event.club_id == club_id, Event.start_time < datetime.utcnow()).order_by(Event.start_time.desc()))
        member_ids = list(db.scalars(select(ClubMember.member_id).where(ClubMember.club_id == club_id).order_by(ClubMember.member_id)))
        assert event and len(member_ids) > 1
        member_id, future_member_id = member_ids[:2]
        event_id = event.id
        type_id = event.event_type_id
        future_event = Event(id=str(uuid4()), club_id=club_id, event_type_id=type_id, title="Future feedback test", start_time=datetime.utcnow() + timedelta(days=3), duration_minutes=60, venue="Feedback Test Room", status="scheduled")
        db.add(future_event)
        future_rsvp = RSVP(id=str(uuid4()), event_id=future_event.id, member_id=future_member_id, status="yes", attended=True, rating=5)
        db.add(future_rsvp)
        db.commit()
        future_id = future_event.id
    engine.dispose()
    old_path = os.environ.get("QUORUM_DB_PATH")
    os.environ["QUORUM_DB_PATH"] = str(database)
    try:
        with TestClient(app) as client:
            organizer = _login(client, "organizer.acm@quorum.local", DEMO_PASSWORDS["organizer"])
            club_id = organizer["user"]["clubs"][0]["id"]
            csrf = client.get("/api/auth/csrf").json()["csrf_token"]
            body = {"attendees": [{"member_id": person_id, "attended": person_id == member_id, "rating": 5 if person_id == member_id else None} for person_id in member_ids]}
            response = client.post(f"/api/clubs/{club_id}/events/{event_id}/feedback", json=body, headers={"X-CSRF-Token": csrf})
            assert response.status_code == 200
            assert response.json()["recorded_members"] == len(member_ids)
            future = client.post(f"/api/clubs/{club_id}/events/{future_id}/feedback", json=body, headers={"X-CSRF-Token": csrf})
            assert future.status_code == 409
            bad_rating = client.post(f"/api/clubs/{club_id}/events/{event_id}/feedback", json={"attendees": [{"member_id": member_id, "attended": False, "rating": 5}]}, headers={"X-CSRF-Token": csrf})
            assert bad_rating.status_code == 422
            client.cookies.clear()
            member_user = _login(client, "member.acm@quorum.local", DEMO_PASSWORDS["member"])
            member_club = member_user["user"]["clubs"][0]["id"]
            member_csrf = client.get("/api/auth/csrf").json()["csrf_token"]
            forbidden = client.post(f"/api/clubs/{member_club}/events/{event_id}/feedback", json=body, headers={"X-CSRF-Token": member_csrf})
            assert forbidden.status_code == 403

        engine = create_database_engine(database)
        with make_session_factory(engine)() as db:
            persisted = db.scalar(select(RSVP).where(RSVP.event_id == event_id, RSVP.member_id == member_id))
            ledger = db.scalar(select(FairnessLedger).where(FairnessLedger.club_id == club_id, FairnessLedger.member_id == member_id))
            assert persisted and persisted.attended and persisted.rating == 5
            assert ledger and ledger.satisfaction == 1.0
            future_ledger = db.scalar(select(FairnessLedger).where(FairnessLedger.club_id == club_id, FairnessLedger.member_id == future_member_id))
            assert future_ledger is not None
            future_ledger.updated_at = datetime.utcnow() + timedelta(days=3)
            db.commit()
            cutoff = datetime.combine(date(2026, 1, 1), time.min)
            attendance_rows = load_attendance_rows_before(db, club_id, [member_id], cutoff)
            assert all(row[5] < cutoff for row in attendance_rows)
            fairness = load_fairness_records_before(db, club_id, cutoff)
            assert member_id not in fairness or fairness[member_id].updated_at <= cutoff
            future_rows = load_attendance_rows_before(db, club_id, [future_member_id], cutoff)
            assert all(row[1] != future_id for row in future_rows)
            assert future_member_id not in fairness
        engine.dispose()
    finally:
        if old_path is None:
            os.environ.pop("QUORUM_DB_PATH", None)
        else:
            os.environ["QUORUM_DB_PATH"] = old_path
