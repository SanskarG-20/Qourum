"""Auth, validation, and response contract tests for the club plan endpoint."""

from datetime import date, time
import os
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from backend.app.database import create_database_engine, make_session_factory
from backend.app.main import app
from backend.app.models import Availability, ClubMember, MemberSettings
from backend.app.seed import DEMO_PASSWORDS


def _login(client, email, password):
    csrf = client.get("/api/auth/csrf").json()["csrf_token"]
    response = client.post("/api/auth/login", json={"email": email, "password": password},
                           headers={"X-CSRF-Token": csrf})
    assert response.status_code == 200
    return response.json()


def test_plan_endpoint_returns_results_rejections_and_requires_organizer(seeded_database, tmp_path):
    database = tmp_path / "club-plan.db"
    seeded_database(database)
    engine = create_database_engine(database)
    with make_session_factory(engine)() as session:
        member_ids = list(session.scalars(select(ClubMember.member_id).where(
            ClubMember.club_id.in_(select(ClubMember.club_id).distinct())
        )))
        session.execute(delete(Availability).where(Availability.member_id.in_(member_ids)))
        session.add_all([
            Availability(id=str(uuid4()), member_id=member_id, day_of_week=weekday, specific_date=None,
                         start_time=time(9), end_time=time(23), is_available=True)
            for member_id in member_ids for weekday in range(7)
        ])
        for profile in session.scalars(select(MemberSettings).where(MemberSettings.member_id.in_(member_ids))):
            profile.max_fee_inr = 100000
            profile.mode_preference = "either"
        session.commit()
    engine.dispose()

    previous_path = os.environ.get("QUORUM_DB_PATH")
    os.environ["QUORUM_DB_PATH"] = str(database)
    try:
        with TestClient(app) as client:
            organizer = _login(client, "organizer.acm@quorum.local", DEMO_PASSWORDS["organizer"])
            club_id = organizer["user"]["clubs"][0]["id"]
            csrf = client.get("/api/auth/csrf").json()["csrf_token"]
            headers = {"X-CSRF-Token": csrf}
            presets_response = client.get(f"/api/clubs/{club_id}/plan-presets")
            assert presets_response.status_code == 200, presets_response.text
            preset_body = presets_response.json()
            presets = {item["id"]: item for item in preset_body["recipes"]}
            assert set(presets) == {
                "max_turnout", "nobody_left_out", "budget_friendly",
                "try_something_new", "beginner_friendly", "exam_season_light",
            }
            assert presets["nobody_left_out"]["settings"]["strategy"] == "least_misery"
            assert presets["nobody_left_out"]["settings"]["fairness"] is True
            assert presets["budget_friendly"]["settings"]["fee_cap_inr"] == preset_body["median_member_max_fee"]
            assert preset_body["lab_heavy_weekdays"] == [1, 3]
            response = client.post(f"/api/clubs/{club_id}/plan", json={
                "start_date": date(2027, 2, 1).isoformat(),
                "horizon_days": 1, "min_people_available": 2, "strategy": "average", "top_k": 2,
            }, headers=headers)
            assert response.status_code == 200, response.text
            body = response.json()
            assert body["candidate_count"] > 0
            assert body["rejected_candidates"]
            assert body["settings"]["strategy"] == "average"
            if body["recommendations"]:
                item = body["recommendations"][0]
                assert "expected_attendance_interval_95" in item
                assert "why_line_inputs" in item
                assert all("satisfaction" in value for value in item["per_member_satisfaction"].values())

            invalid = client.post(f"/api/clubs/{club_id}/plan", json={"baseline": "unknown"}, headers=headers)
            assert invalid.status_code == 422
            too_many = client.post(f"/api/clubs/{club_id}/plan", json={"min_people_available": 1000}, headers=headers)
            assert too_many.status_code == 422

            client.cookies.clear()
            member = _login(client, "member.acm@quorum.local", DEMO_PASSWORDS["member"])
            member_club = member["user"]["clubs"][0]["id"]
            member_csrf = client.get("/api/auth/csrf").json()["csrf_token"]
            forbidden = client.post(f"/api/clubs/{member_club}/plan", json={},
                                    headers={"X-CSRF-Token": member_csrf})
            assert forbidden.status_code == 403
            hidden_presets = client.get(f"/api/clubs/{member_club}/plan-presets")
            assert hidden_presets.status_code == 403
    finally:
        if previous_path is None:
            os.environ.pop("QUORUM_DB_PATH", None)
        else:
            os.environ["QUORUM_DB_PATH"] = previous_path
