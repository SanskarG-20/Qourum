"""What-if filters rerun the planning pipeline and preserve rejection evidence."""

from datetime import date, time
import os

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.seed import DEMO_PASSWORDS

from backend.planning.models import AvailabilityWindow, PlanFormat, PlanMember
from backend.planning.pipeline import build_plan


DAY = date(2027, 2, 1)


def _plan(**changes):
    windows = tuple(AvailabilityWindow(day, time(9), time(23), True) for day in range(7))
    members = [PlanMember("a", 100, "either", windows), PlanMember("b", 100, "either", windows)]
    members += [PlanMember("c", 100, "either", ())]
    excluded_member_id = changes.pop("excluded_member_id", None)
    if excluded_member_id:
        members = [member for member in members if member.member_id != excluded_member_id]
    formats = [
        PlanFormat("free", "Free meetup", "type-1", "social", "beginner", 60, 0, ("in_person",), 1, 20),
        PlanFormat("paid", "Paid workshop", "type-2", "learning", "beginner", 60, 100, ("in_person",), 1, 20),
    ]
    settings = dict(members=members, formats=formats, observations=[], start_date=DAY,
                    horizon_days=2, min_people_available=2, top_k=10, diversity=False)
    settings.update(changes)
    return build_plan(**settings)


def _reasons(plan, **identity):
    return {reason for item in plan["rejected_candidates"]
            if all(item[key] == value for key, value in identity.items())
            for reason in item["reason_codes"]}


def test_fee_cap_and_format_exclusion_rerun_hard_filters():
    base = _plan()
    assert any(item["format_id"] == "paid" for item in base["recommendations"])
    capped = _plan(fee_cap_inr=0)
    excluded = _plan(excluded_format_ids=["free"])
    assert "fee_above_club_cap" in _reasons(capped, format_id="paid")
    assert "format_excluded" in _reasons(excluded, format_id="free")
    assert capped["feasible_count"] < base["feasible_count"]
    assert excluded["feasible_count"] < base["feasible_count"]


def test_day_and_time_block_filters_reject_other_candidates():
    day = _plan(only_date=DAY)
    block = _plan(only_time_block="evening")
    assert all(item["event_date"] == DAY.isoformat() for item in day["recommendations"])
    assert all(item["time_block"] == "evening" for item in block["recommendations"])
    assert "date_excluded" in _reasons(day, event_date="2027-02-02")
    assert "time_block_excluded" in _reasons(block, time_block="morning")


def test_excluding_member_and_raising_minimum_recompute_results():
    base = _plan()
    without_member = _plan(excluded_member_id="b", min_people_available=1)
    raised = _plan(min_people_available=3)
    assert without_member["recommendations"]
    assert "b" not in without_member["recommendations"][0]["per_member_satisfaction"]
    assert without_member["recommendations"][0]["expected_attendance"] != base["recommendations"][0]["expected_attendance"]
    assert raised["recommendations"] == []
    assert "min_people_available" in _reasons(raised, format_id="free")


def test_plan_api_excludes_member_from_rerun_and_rejects_unknown_member(seeded_database, tmp_path):
    database = tmp_path / "what-if.db"
    seeded_database(database)
    previous = os.environ.get("QUORUM_DB_PATH")
    os.environ["QUORUM_DB_PATH"] = str(database)
    try:
        with TestClient(app) as client:
            csrf = client.get("/api/auth/csrf").json()["csrf_token"]
            headers = {"X-CSRF-Token": csrf}
            login = client.post("/api/auth/login", json={
                "email": "organizer.acm@quorum.local", "password": DEMO_PASSWORDS["organizer"],
            }, headers=headers)
            assert login.status_code == 200
            club_id = login.json()["user"]["clubs"][0]["id"]
            member_id = client.get(f"/api/clubs/{club_id}/members").json()[0]["id"]
            csrf = client.get("/api/auth/csrf").json()["csrf_token"]
            headers = {"X-CSRF-Token": csrf}
            base = client.post(f"/api/clubs/{club_id}/plan", json={
                "start_date": "2027-02-01", "horizon_days": 1, "min_people_available": 1, "top_k": 2,
            }, headers=headers)
            assert base.status_code == 200
            after = client.post(f"/api/clubs/{club_id}/plan", json={
                "start_date": "2027-02-01", "horizon_days": 1, "min_people_available": 1,
                "top_k": 2, "excluded_member_id": member_id,
            }, headers=headers)
            assert after.status_code == 200, after.text
            assert after.json()["settings"]["excluded_member_id"] == member_id
            assert after.json()["settings_hash"] != base.json()["settings_hash"]
            assert all(member_id not in item["per_member_satisfaction"] for item in after.json()["recommendations"])
            unknown = client.post(f"/api/clubs/{club_id}/plan", json={
                "start_date": "2027-02-01", "horizon_days": 1,
                "min_people_available": 1, "excluded_member_id": "not-a-member",
            }, headers=headers)
            assert unknown.status_code == 422
    finally:
        if previous is None:
            os.environ.pop("QUORUM_DB_PATH", None)
        else:
            os.environ["QUORUM_DB_PATH"] = previous
