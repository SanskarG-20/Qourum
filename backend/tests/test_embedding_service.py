"""Offline-model, durable-cache, and leakage-safe profile tests."""

from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pytest
from sqlalchemy import select

from backend.app import embedding_service
from backend.app.database import create_database_engine, make_session_factory
from backend.app.models import Base, Club, ClubMember, EmbeddingCache, Event, EventType, RSVP, User


def test_vendored_model_is_local_deterministic_and_normalized():
    model = embedding_service.load_encoder()
    first = model.encode(["A local club workshop with guided activities."], normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False)
    second = model.encode(["A local club workshop with guided activities."], normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False)
    assert first.shape == (1, 384)
    assert np.isfinite(first).all()
    assert np.isclose(np.linalg.norm(first[0]), 1.0, atol=1e-6)
    np.testing.assert_allclose(first, second, rtol=0, atol=1e-7)


def test_disabled_flag_skips_model_and_cache_access(monkeypatch):
    monkeypatch.setenv("QUORUM_EMBEDDINGS_ENABLED", "false")
    monkeypatch.setattr(embedding_service, "load_encoder", lambda: (_ for _ in ()).throw(AssertionError("encoder loaded")))
    assert embedding_service.content_evidence_for_candidates(None, "club", ["member"], [], datetime.now()) == {}


def test_missing_vendored_weights_fail_without_download_attempt(tmp_path, monkeypatch):
    monkeypatch.setattr(embedding_service, "MODEL_DIRECTORY", tmp_path)
    monkeypatch.setattr(embedding_service, "_encoder", None)
    with pytest.raises(FileNotFoundError, match="Vendored sentence embedding model is missing"):
        embedding_service.load_encoder()


def test_cache_uses_text_hash_and_revision_and_encodes_misses_once(tmp_path, monkeypatch):
    calls = []

    class FakeEncoder:
        def encode(self, texts, **_kwargs):
            calls.append(list(texts))
            vectors = np.zeros((len(texts), 384), dtype=np.float32)
            vectors[:, 0] = 1
            return vectors

    monkeypatch.setattr(embedding_service, "_encoder", FakeEncoder())
    engine = create_database_engine(tmp_path / "cache.db")
    Base.metadata.create_all(engine)
    factory = make_session_factory(engine)
    with factory.begin() as session:
        one = embedding_service.encode_and_cache(session, ["same  text"])
        two = embedding_service.encode_and_cache(session, ["same text"])
        assert np.array_equal(one["same text"], two["same text"])
        assert calls == [["same text"]]
        assert len(session.scalars(select(EmbeddingCache)).all()) == 1
        monkeypatch.setattr(embedding_service, "MODEL_REVISION", "another-revision")
        embedding_service.encode_and_cache(session, ["same text"])
        assert calls == [["same text"], ["same text"]]
        assert len(session.scalars(select(EmbeddingCache)).all()) == 2
    engine.dispose()

def test_profiles_use_only_attended_descriptions_before_cutoff(tmp_path, monkeypatch):
    class FakeEncoder:
        def encode(self, texts, **_kwargs):
            vectors = np.zeros((len(texts), 384), dtype=np.float32)
            for index, text in enumerate(texts):
                vectors[index, 0 if "early" in text else 1] = 1
            return vectors

    monkeypatch.setattr(embedding_service, "_encoder", FakeEncoder())
    engine = create_database_engine(tmp_path / "history.db")
    Base.metadata.create_all(engine)
    factory = make_session_factory(engine)
    cutoff = datetime(2026, 1, 1)
    with factory.begin() as session:
        session.add_all([
            Club(id="club", name="Club"),
            User(id="member", name="Member", email="member@example.test"),
            User(id="new-member", name="New Member", email="new-member@example.test"),
            EventType(id="target", name="Target", category="Other", description="early target", default_duration_minutes=60),
            EventType(id="other", name="Other", category="Other", description="late target", default_duration_minutes=60),
        ])
        session.flush()
        session.add_all([
            ClubMember(club_id="club", member_id="member", role="member"),
            ClubMember(club_id="club", member_id="new-member", role="member"),
        ])
        session.flush()
        session.add_all([
            Event(id="before", club_id="club", event_type_id="other", title="Before", description="early attended event", start_time=cutoff - timedelta(days=2), duration_minutes=60, venue="Room", status="completed"),
            Event(id="equal", club_id="club", event_type_id="other", title="Equal", description="late equal event", start_time=cutoff, duration_minutes=60, venue="Room", status="completed"),
            Event(id="future", club_id="club", event_type_id="other", title="Future", description="late future event", start_time=cutoff + timedelta(days=2), duration_minutes=60, venue="Room", status="completed"),
        ])
        session.flush()
        session.add_all([
            RSVP(id="yes", event_id="before", member_id="member", status="yes", attended=True),
            RSVP(id="equal-rsvp", event_id="equal", member_id="member", status="yes", attended=True),
            RSVP(id="future-rsvp", event_id="future", member_id="member", status="yes", attended=True),
        ])
        session.flush()
        result = embedding_service.content_evidence_for_candidates(
            session, "club", ["member", "new-member"], [session.get(EventType, "target"), session.get(EventType, "other")], cutoff,
        )
        assert result["target"]["member"].observation_count == 1
        assert result["other"]["member"].observation_count == 1
        assert result["target"]["member"].similarity > result["other"]["member"].similarity
        assert "new-member" not in result["target"]
    engine.dispose()
