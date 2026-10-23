"""API validation and authorization tests for member onboarding."""

import os

from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.app.database import create_database_engine, make_session_factory
from backend.app.models import Club, EventType
from backend.app.seed import DEMO_PASSWORDS, seed_database


def _login(client: TestClient, email: str, password: str) -> dict:
    csrf = client.get("/api/auth/csrf").json()["csrf_token"]
    response = client.post("/api/auth/login", json={"email": email, "password": password}, headers={"X-CSRF-Token": csrf})
    assert response.status_code == 200
    return response.json()["user"]


def test_member_onboarding_validation_and_cold_start_fallback(tmp_path):
    db_path = tmp_path / "onboarding.db"
    seed_database(seed=42, db_path=db_path)
    old_path = os.environ.get("QUORUM_DB_PATH")
    os.environ["QUORUM_DB_PATH"] = str(db_path)
    try:
        engine = create_database_engine(db_path)
        with make_session_factory(engine)() as db:
            event_type_id = db.scalar(select(EventType.id).order_by(EventType.id))
        engine.dispose()
        assert event_type_id
        with TestClient(__import__("backend.app.main", fromlist=["app"]).app) as client:
            user = _login(client, "member.acm@quorum.local", DEMO_PASSWORDS["member"])
            club_id = user["clubs"][0]["id"]
            initial = client.get(f"/api/clubs/{club_id}/onboarding")
            assert initial.status_code == 200
            assert initial.json()["is_cold_start"] is True
            assert len(initial.json()["fallback_popularity"]) == 12

            csrf = client.get("/api/auth/csrf").json()["csrf_token"]
            payload = {
                "preferences": [{"event_type_id": event_type_id, "rating": 5}],
                "availability": [
                    {"day_of_week": 1, "start_time": "17:00", "end_time": "19:00"},
                    {"day_of_week": 1, "start_time": "18:00", "end_time": "20:00"},
                ],
                "latest_start_time": "21:00",
            }
            invalid = client.put(f"/api/clubs/{club_id}/onboarding", json=payload, headers={"X-CSRF-Token": csrf})
            assert invalid.status_code == 422
            payload["availability"].pop()
            saved = client.put(f"/api/clubs/{club_id}/onboarding", json=payload, headers={"X-CSRF-Token": csrf})
            assert saved.status_code == 200
            assert saved.json()["preferences"] == [{"event_type_id": event_type_id, "rating": 5}]
            assert saved.json()["availability"][0]["start_time"] == "17:00"
            assert saved.json()["latest_start_time"] == "21:00"
            assert client.put(f"/api/clubs/{club_id}/onboarding", json=payload).status_code == 403
    finally:
        if old_path is None:
            os.environ.pop("QUORUM_DB_PATH", None)
        else:
            os.environ["QUORUM_DB_PATH"] = old_path
