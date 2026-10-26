"""Planning requirements must filter suggestions and survive scheduling."""

import os
from datetime import date, time, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from backend.app.database import create_database_engine, make_session_factory
from backend.app.main import app
from backend.app.models import Availability, ClubMember, Event
from backend.app.seed import DEMO_PASSWORDS


def test_event_requirements_filter_and_persist(seeded_database, tmp_path):
    database = seeded_database(tmp_path / "requirements.db")
    engine = create_database_engine(database)
    with make_session_factory(engine)() as session:
        member_ids = list(session.scalars(select(ClubMember.member_id).distinct()))
        session.execute(delete(Availability).where(Availability.member_id.in_(member_ids), Availability.day_of_week.is_not(None)))
        session.add_all(
            Availability(id=str(uuid4()), member_id=member_id, day_of_week=day,
                         specific_date=None, start_time=time(9), end_time=time(21), is_available=True)
            for member_id in member_ids for day in range(7)
        )
        session.commit()
    engine.dispose()

    previous_path = os.environ.get("QUORUM_DB_PATH")
    os.environ["QUORUM_DB_PATH"] = str(database)
    try:
        with TestClient(app) as client:
            csrf = client.get("/api/auth/csrf").json()["csrf_token"]
            login = client.post("/api/auth/login", json={"email": "organizer.acm@quorum.local", "password": DEMO_PASSWORDS["organizer"]}, headers={"X-CSRF-Token": csrf})
            assert login.status_code == 200
            club_id = login.json()["user"]["clubs"][0]["id"]
            headers = {"X-CSRF-Token": client.get("/api/auth/csrf").json()["csrf_token"]}
            catalog = client.get(f"/api/clubs/{club_id}/event-formats")
            assert catalog.status_code == 200
            assert catalog.json()["fees_are_synthetic_estimates"] is True
            assert {"hackathon", "case-competition", "campus-quest"} <= {item["id"] for item in catalog.json()["formats"]}

            endpoint = f"/api/clubs/{club_id}/recommendations"
            invalid = client.post(endpoint, json={"format_ids": ["unknown"]}, headers=headers)
            assert invalid.status_code == 422
            excluded = client.post(endpoint, json={"format_ids": ["case-competition"], "fee_policy": "free"}, headers=headers)
            assert excluded.status_code == 200
            assert excluded.json()["candidate_count"] == 0
            online_quest = client.post(endpoint, json={"format_ids": ["campus-quest"], "delivery_mode": "online"}, headers=headers)
            assert online_quest.status_code == 200
            assert online_quest.json()["candidate_count"] == 0

            start_date = (date.today() + timedelta(days=14)).isoformat()
            paid = client.post(endpoint, json={"format_ids": ["case-competition"], "fee_policy": "paid", "max_fee_inr": 99,
                                               "delivery_mode": "online", "horizon_days": 1, "top_n": 2,
                                               "quorum": 1, "start_date": start_date}, headers=headers)
            assert paid.status_code == 200
            assert paid.json()["candidate_count"] > 0
            assert paid.json()["recommendations"]
            assert all(item["event_type"] == "Case Competition" and item["estimated_fee_inr"] == 99
                       and item["delivery_mode"] == "online" and item["venue"] == "Online"
                       for item in paid.json()["recommendations"])

            quest = client.post(endpoint, json={"format_ids": ["campus-quest"], "fee_policy": "free",
                                                "delivery_mode": "in_person", "horizon_days": 1, "top_n": 5,
                                                "quorum": 1, "start_date": start_date}, headers=headers)
            assert quest.status_code == 200
            assert quest.json()["recommendations"]
            assert all("online" not in item["venue"].lower() and "discord" not in item["venue"].lower()
                       for item in quest.json()["recommendations"])
            assert len({item["start"] for item in quest.json()["recommendations"]}) == len(quest.json()["recommendations"])

            chosen = paid.json()["recommendations"][0]
            scheduled = client.post(f"/api/clubs/{club_id}/events", json={
                "event_type_id": chosen["event_type_id"], "event_format_id": chosen["event_format_id"],
                "start_time": chosen["start"], "venue": chosen["venue"], "delivery_mode": chosen["delivery_mode"],
            }, headers=headers)
            assert scheduled.status_code == 200
            assert scheduled.json()["title"] == "Case Competition"
            assert scheduled.json()["estimated_fee_inr"] == 99
            with make_session_factory(create_database_engine(database))() as session:
                event = session.get(Event, scheduled.json()["id"])
                assert (event.event_format_id, event.delivery_mode, event.estimated_fee_inr) == ("case-competition", "online", 99)
    finally:
        if previous_path is None:
            os.environ.pop("QUORUM_DB_PATH", None)
        else:
            os.environ["QUORUM_DB_PATH"] = previous_path
