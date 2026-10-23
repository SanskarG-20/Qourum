"""Adversarial and property-style tests for local application boundaries."""

from datetime import datetime, timedelta

import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.app import main
from backend.app.seed import seed_database
from backend.recsys.individual import AttendanceObservation, TimeObservation, score_members


def test_score_range_and_repeatability_over_generated_inputs():
    rng = np.random.default_rng(42)
    now = datetime(2026, 1, 1, 12)
    members = [f"member-{index}" for index in range(60)]
    preferences = {
        member: {"type-a": int(rng.integers(1, 6))}
        for member in members if rng.random() < 0.65
    }
    attendance = {
        member: [AttendanceObservation("type-a", "yes", bool(rng.integers(0, 2)), now - timedelta(days=int(rng.integers(0, 700))))]
        for member in members if rng.random() < 0.55
    }
    slots = {
        member: [TimeObservation(int(rng.integers(0, 7)), int(rng.integers(0, 24)), bool(rng.integers(0, 2))) for _ in range(int(rng.integers(1, 8)))]
        for member in members if rng.random() < 0.45
    }
    args = (members, "type-a", 3, 18, preferences, attendance, slots)
    first = score_members(*args, now=now)
    second = score_members(*args, now=now)
    assert first == second
    assert all(np.isfinite(item.score) and 0 <= item.score <= 1 for item in first)


def test_injection_and_xss_strings_remain_data_and_requests_are_validated(tmp_path, monkeypatch):
    db_path = tmp_path / "hardening.db"
    seed_database(seed=42, db_path=db_path)
    monkeypatch.setenv("QUORUM_DB_PATH", str(db_path))
    with TestClient(main.app) as client:
        csrf = client.get("/api/auth/csrf").json()["csrf_token"]
        login = client.post(
            "/api/auth/login",
            json={"email": "organizer.acm@quorum.local' OR 1=1 --", "password": "anything"},
            headers={"X-CSRF-Token": csrf},
        )
        assert login.status_code == 422
        csrf = client.get("/api/auth/csrf").json()["csrf_token"]
        login = client.post(
            "/api/auth/login",
            json={"email": "organizer.acm@quorum.local", "password": "QuorumOrganizer42!"},
            headers={"X-CSRF-Token": csrf},
        )
        assert login.status_code == 200
        organizer = login.json()["user"]
        club_id = next(club["id"] for club in organizer["clubs"] if club["role"] == "organizer")
        csrf = login.json()["csrf_token"]

        invalid = client.post(
            f"/api/clubs/{club_id}/recommendations",
            json={"strategy": "' OR 1=1 --", "top_n": 100000},
            headers={"X-CSRF-Token": csrf},
        )
        assert invalid.status_code == 422
        invalid_path = client.get(f"/api/clubs/anything' OR 1=1 --/events")
        assert invalid_path.status_code in {403, 404}

        event_type = client.get(f"/api/clubs/{club_id}/onboarding").json()["event_types"][0]["id"]
        start = (datetime.utcnow() + timedelta(days=3)).replace(minute=0, second=0, microsecond=0).isoformat()
        invalid_event = client.post(
            f"/api/clubs/{club_id}/events",
            json={"event_type_id": "' OR 1=1 --", "start_time": start, "venue": "Hall"},
            headers={"X-CSRF-Token": csrf},
        )
        assert invalid_event.status_code == 422
        venue = "<script>alert('xss')</script> ' OR 1=1 --"
        created = client.post(
            f"/api/clubs/{club_id}/events",
            json={"event_type_id": event_type, "start_time": start, "venue": venue},
            headers={"X-CSRF-Token": csrf},
        )
        assert created.status_code == 200
        assert created.json()["venue"] == venue
        invalid_rsvp = client.post(
            f"/api/clubs/{club_id}/events/{created.json()['id']}/rsvp",
            json={"status": "yes' OR 1=1 --"},
            headers={"X-CSRF-Token": csrf},
        )
        assert invalid_rsvp.status_code == 422
        stored = client.get(f"/api/clubs/{club_id}/events")
        assert stored.status_code == 200
        assert next(row for row in stored.json() if row["id"] == created.json()["id"])["venue"] == venue


def test_socket_blocker_rejects_connection_attempt(monkeypatch):
    import socket

    with pytest.raises(AssertionError, match="Outbound (network|DNS) access"):
        socket.create_connection(("example.invalid", 443))
    datagram = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        with pytest.raises(AssertionError, match="Outbound network access"):
            datagram.sendto(b"blocked", ("203.0.113.10", 53))
    finally:
        datagram.close()
