"""P11 event acceptance, RSVP, and role boundaries."""

import os
from datetime import date, time, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from backend.app.database import create_database_engine, make_session_factory
from backend.app.main import app
from backend.app.models import Availability, ClubMember, EventType, MemberSettings, utc_now
from backend.app.seed import DEMO_PASSWORDS


def _login(client: TestClient, email: str, password: str) -> dict:
    csrf = client.get("/api/auth/csrf").json()["csrf_token"]
    response = client.post("/api/auth/login", json={"email": email, "password": password}, headers={"X-CSRF-Token": csrf})
    assert response.status_code == 200
    return response.json()


def test_organizer_accepts_slot_and_member_rsvps(seeded_database, tmp_path):
    database = tmp_path / "event-workflow.db"
    seeded_database(database)
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


def test_only_organizers_cancel_upcoming_events_and_slot_is_released(seeded_database, tmp_path):
    database = tmp_path / "event-cancel.db"
    seeded_database(database)
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
            headers = {"X-CSRF-Token": csrf}
            start = (utc_now() + timedelta(days=12)).replace(minute=0, second=0, microsecond=0).isoformat()
            payload = {"event_type_id": event_type_id, "start_time": start, "venue": "Local Club Room"}
            event = client.post(f"/api/clubs/{club_id}/events", json=payload, headers=headers).json()

            client.cookies.clear()
            member = _login(client, "member.acm@quorum.local", DEMO_PASSWORDS["member"])
            member_csrf = client.get("/api/auth/csrf").json()["csrf_token"]
            denied = client.post(f"/api/clubs/{member['user']['clubs'][0]['id']}/events/{event['id']}/cancel", headers={"X-CSRF-Token": member_csrf})
            assert denied.status_code == 403

            client.cookies.clear()
            _login(client, "organizer.acm@quorum.local", DEMO_PASSWORDS["organizer"])
            headers = {"X-CSRF-Token": client.get("/api/auth/csrf").json()["csrf_token"]}
            cancelled = client.post(f"/api/clubs/{club_id}/events/{event['id']}/cancel", headers=headers)
            assert cancelled.status_code == 200 and cancelled.json()["status"] == "cancelled"
            assert client.post(f"/api/clubs/{club_id}/events/{event['id']}/cancel", headers=headers).status_code == 409
            assert client.post(f"/api/clubs/{club_id}/events/missing/cancel", headers=headers).status_code == 404
            assert client.post(f"/api/clubs/{club_id}/events", json=payload, headers=headers).status_code == 200
    finally:
        if old_path is None:
            os.environ.pop("QUORUM_DB_PATH", None)
        else:
            os.environ["QUORUM_DB_PATH"] = old_path


def test_engine_plan_accept_persists_exact_slot_without_venue(seeded_database, tmp_path):
    database = tmp_path / "engine-plan-accept.db"
    seeded_database(database)
    engine = create_database_engine(database)
    with make_session_factory(engine)() as db:
        member_ids = list(db.scalars(select(ClubMember.member_id)))
        db.execute(delete(Availability).where(Availability.member_id.in_(member_ids)))
        db.add_all([
            Availability(id=f"{member_id}-{day}", member_id=member_id, day_of_week=day, specific_date=None,
                         start_time=time(9), end_time=time(23), is_available=True)
            for member_id in member_ids for day in range(7)
        ])
        for profile in db.scalars(select(MemberSettings).where(MemberSettings.member_id.in_(member_ids))):
            profile.max_fee_inr = 100000
            profile.mode_preference = "either"
        db.commit()
    engine.dispose()

    old_path = os.environ.get("QUORUM_DB_PATH")
    os.environ["QUORUM_DB_PATH"] = str(database)
    try:
        with TestClient(app) as client:
            organizer = _login(client, "organizer.acm@quorum.local", DEMO_PASSWORDS["organizer"])
            club_id = organizer["user"]["clubs"][0]["id"]
            headers = {"X-CSRF-Token": client.get("/api/auth/csrf").json()["csrf_token"]}
            plan_response = client.post(f"/api/clubs/{club_id}/plan", headers=headers, json={
                "start_date": (date.today() + timedelta(days=3)).isoformat(),
                "horizon_days": 21,
                "min_people_available": 5,
                "strategy": "average",
                "fairness": False,
                "diversity": False,
                "selected_format_ids": ["workshop"],
                "delivery_mode": "any",
                "fee_cap_inr": 0,
            })
            assert plan_response.status_code == 200, plan_response.text
            plan = plan_response.json()
            assert plan["recommendations"], plan["rejected_candidates"][:2]
            result = plan["recommendations"][0]
            created_response = client.post(f"/api/clubs/{club_id}/events", headers=headers, json={
                "event_type_id": result["event_type_id"],
                "event_format_id": result["format_id"],
                "start_time": result["start"],
                "time_block": result["time_block"],
                "delivery_mode": result["mode"],
                "fee_inr": result["fee_inr"],
                "planning_snapshot": {
                    "expected_attendance": result["expected_attendance"],
                    "expected_attendance_interval_95": result["expected_attendance_interval_95"],
                    "available_member_count": len(result["available_member_ids"]),
                    "confidence": result["confidence"],
                    "settings": {
                        "strategy": plan["settings"]["effective_strategy"],
                        "fairness": plan["settings"]["fairness"],
                        "diversity": plan["settings"]["diversity"],
                        "fee_cap_inr": plan["settings"]["fee_cap_inr"],
                        "horizon_days": plan["settings"]["horizon_days"],
                    },
                },
            })
            assert created_response.status_code == 200, created_response.text
            event = created_response.json()
            assert event["status"] == "scheduled"
            assert event["venue"] is None
            assert event["event_format_id"] == result["format_id"]
            assert event["event_type_id"] == result["event_type_id"]
            assert event["start_time"] == result["start"]
            assert event["delivery_mode"] == result["mode"]
            assert event["estimated_fee_inr"] == result["fee_inr"]
            assert event["planning_snapshot"]["expected_attendance"] == result["expected_attendance"]
            assert event["planning_snapshot"]["expected_attendance_interval_95"] == result["expected_attendance_interval_95"]
            assert event["planning_snapshot"]["settings"] == {
                "strategy": "average", "fairness": False, "diversity": False,
                "fee_cap_inr": 0, "horizon_days": 21,
            }

            listed = client.get(f"/api/clubs/{club_id}/events").json()
            persisted = next(row for row in listed if row["id"] == event["id"])
            assert persisted["venue"] is None
            assert persisted["planning_snapshot"] == event["planning_snapshot"]
    finally:
        if old_path is None:
            os.environ.pop("QUORUM_DB_PATH", None)
        else:
            os.environ["QUORUM_DB_PATH"] = old_path
