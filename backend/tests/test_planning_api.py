"""Auth, validation, and response contract tests for the club plan endpoint."""

from datetime import date, time
import os
from time import perf_counter
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
            assert body["candidate_count"] == body["rejected_candidate_count"] + body["feasible_count"]
            assert body["availability_heatmap"]["cells"]
            assert body["rejection_groups"]
            assert all(group["count"] == sum(
                group["reason_code"] in item["reason_codes"] for item in body["rejected_candidates"]
            ) for group in body["rejection_groups"])
            assert body["settings"]["strategy"] == "average"
            if body["recommendations"]:
                item = body["recommendations"][0]
                assert "expected_attendance_interval_95" in item
                assert "why_line_inputs" in item
                assert all("satisfaction" in value for value in item["per_member_satisfaction"].values())

            sweep_started = perf_counter()
            sweep_response = client.post(f"/api/clubs/{club_id}/plan-sweep", json={
                "start_date": date(2027, 2, 1).isoformat(),
                "horizon_days": 21, "min_people_available": 2, "top_k": 2, "max_plans": 12,
            }, headers=headers)
            sweep_elapsed = perf_counter() - sweep_started
            assert sweep_response.status_code == 200, sweep_response.text
            sweep = sweep_response.json()
            assert sweep["plans_generated"] <= 12
            assert sweep["plans_with_results"] > 0
            assert sweep_elapsed < 5.0, f"12-plan 21-day sweep took {sweep_elapsed:.2f}s"
            assert sweep["dot_size_label"] == "Estimated fee per person (₹)"
            assert sweep["pareto_front_ids"]
            assert {point["strategy"] for point in sweep["points"]} == {"average", "least_misery"}
            assert {point["fairness"] for point in sweep["points"]} == {False, True}
            assert {point["diversity"] for point in sweep["points"]} == {False, True}
            assert {point["fee_cap_inr"] for point in sweep["points"]} == {None, 0, 100000}
            selected_point = sweep["points"][0]
            selected_plan = client.post(f"/api/clubs/{club_id}/plan", json=selected_point["settings"],
                                        headers=headers)
            assert selected_plan.status_code == 200, selected_plan.text
            selected = selected_plan.json()
            selected_top = selected["recommendations"][0]
            assert selected["settings_hash"] == selected_point["settings_hash"]
            assert selected["plan_cache_hit"] is True
            assert selected_top["expected_attendance"] == selected_point["expected_turnout"]
            assert selected_top["group_summary"]["minimum"] == selected_point["least_happy_satisfaction"]
            assert selected_top["fee_inr"] == selected_point["dot_size_value"]
            assert selected_top["format_id"] == selected_point["top_format_id"]
            repeated_plan = client.post(f"/api/clubs/{club_id}/plan", json=selected_point["settings"],
                                        headers=headers).json()
            assert repeated_plan["recommendations"] == selected["recommendations"]
            excessive_sweep = client.post(f"/api/clubs/{club_id}/plan-sweep", json={"max_plans": 13}, headers=headers)
            assert excessive_sweep.status_code == 422

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
            forbidden_sweep = client.post(f"/api/clubs/{member_club}/plan-sweep", json={},
                                          headers={"X-CSRF-Token": member_csrf})
            assert forbidden_sweep.status_code == 403
    finally:
        if previous_path is None:
            os.environ.pop("QUORUM_DB_PATH", None)
        else:
            os.environ["QUORUM_DB_PATH"] = previous_path
