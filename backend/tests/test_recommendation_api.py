"""Role, validation, and response contract tests for recommendations."""

import os
from datetime import date, timedelta
from datetime import time
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from backend.app.main import app
from backend.app.database import create_database_engine, make_session_factory
from backend.app.models import Availability, ClubMember
from backend.app.seed import DEMO_PASSWORDS, seed_database


def _login(client: TestClient, email: str, password: str) -> dict:
    csrf = client.get("/api/auth/csrf").json()["csrf_token"]
    response = client.post("/api/auth/login", json={"email": email, "password": password}, headers={"X-CSRF-Token": csrf})
    assert response.status_code == 200
    return response.json()


def test_recommendation_endpoint_role_validation_and_response(tmp_path):
    database = tmp_path / "recommendations.db"
    seed_database(seed=42, db_path=database)
    engine = create_database_engine(database)
    with make_session_factory(engine)() as session:
        member_ids = list(session.scalars(select(ClubMember.member_id).distinct()))
        if member_ids:
            session.execute(delete(Availability).where(Availability.member_id.in_(member_ids), Availability.day_of_week.is_not(None)))
            session.add_all([
                Availability(id=str(uuid4()), member_id=member_id, day_of_week=day, specific_date=None, start_time=time(9), end_time=time(21), is_available=True)
                for member_id in member_ids for day in range(7)
            ])
            session.commit()
    engine.dispose()
    old_path = os.environ.get("QUORUM_DB_PATH")
    os.environ["QUORUM_DB_PATH"] = str(database)
    try:
        with TestClient(app) as client:
            organizer = _login(client, "organizer.acm@quorum.local", DEMO_PASSWORDS["organizer"])
            club_id = organizer["user"]["clubs"][0]["id"]
            csrf = client.get("/api/auth/csrf").json()["csrf_token"]
            headers = {"X-CSRF-Token": csrf}
            invalid = client.post(f"/api/clubs/{club_id}/recommendations", json={"strategy": "made-up"}, headers=headers)
            assert invalid.status_code == 422
            valid = client.post(
                f"/api/clubs/{club_id}/recommendations",
                json={"strategy": "average", "top_n": 2, "horizon_days": 1, "quorum": 1, "start_date": (date.today() + timedelta(days=14)).isoformat()},
                headers=headers,
            )
            assert valid.status_code == 200
            body = valid.json()
            assert body["strategy"] == "average"
            assert body["candidate_count"] > 0
            assert body["feasible_count"] >= len(body["recommendations"])
            for recommendation in body["recommendations"]:
                assert 0 <= recommendation["group_mean"] <= 1
                assert 0 <= recommendation["group_min"] <= 1
                assert recommendation["expected_attendance"] >= recommendation["quorum_required"]

            client.cookies.clear()
            member = _login(client, "member.acm@quorum.local", DEMO_PASSWORDS["member"])
            member_club = member["user"]["clubs"][0]["id"]
            member_csrf = client.get("/api/auth/csrf").json()["csrf_token"]
            forbidden = client.post(f"/api/clubs/{member_club}/recommendations", json={}, headers={"X-CSRF-Token": member_csrf})
            assert forbidden.status_code == 403
    finally:
        if old_path is None:
            os.environ.pop("QUORUM_DB_PATH", None)
        else:
            os.environ["QUORUM_DB_PATH"] = old_path
