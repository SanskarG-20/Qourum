"""Local-only sentence embeddings and cutoff-aware observable content features."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import hashlib
import os
from pathlib import Path
import re
from typing import Mapping, Sequence, TYPE_CHECKING

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

if __package__ == "app" or __package__.startswith("app."):
    from recsys import config
    from recsys.individual import ContentSignal
else:
    from backend.recsys import config
    from backend.recsys.individual import ContentSignal
from .models import EmbeddingCache, Event, EventType, RSVP

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

MODEL_REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
EMBEDDING_DIMENSION = 384
MODEL_DIRECTORY = Path(__file__).resolve().parents[1] / "models" / "all-MiniLM-L6-v2"
_encoder: "SentenceTransformer | None" = None


def embeddings_enabled() -> bool:
    """Return the local feature flag; embeddings are enabled unless explicitly disabled."""
    return os.environ.get("QUORUM_EMBEDDINGS_ENABLED", "true").strip().lower() not in {"0", "false", "no", "off"}


def _normalized_text(text: str) -> str:
    """Normalize whitespace without changing lexical content before hashing or encoding."""
    return re.sub(r"\s+", " ", text).strip()


def _text_hash(text: str) -> str:
    return hashlib.sha256(_normalized_text(text).encode("utf-8")).hexdigest()


def load_encoder() -> "SentenceTransformer":
    """Load only vendored model files with network-related hub behavior disabled."""
    global _encoder
    if _encoder is None:
        if not MODEL_DIRECTORY.is_dir() or not (MODEL_DIRECTORY / "model.safetensors").is_file():
            raise FileNotFoundError(f"Vendored sentence embedding model is missing: {MODEL_DIRECTORY}")
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
        from sentence_transformers import SentenceTransformer

        _encoder = SentenceTransformer(
            str(MODEL_DIRECTORY.resolve()),
            local_files_only=True,
            trust_remote_code=False,
            device="cpu",
        )
        _encoder.eval()
    return _encoder


def encode_and_cache(session: OrmSession, texts: Sequence[str]) -> dict[str, np.ndarray]:
    """Encode normalized texts and persist finite, normalized float32 vectors by hash/revision."""
    normalized = list(dict.fromkeys(_normalized_text(text) for text in texts if _normalized_text(text)))
    hashes = {_text_hash(text): text for text in normalized}
    if not hashes:
        return {}
    rows = session.scalars(select(EmbeddingCache).where(
        EmbeddingCache.model_revision == MODEL_REVISION,
        EmbeddingCache.text_sha256.in_(list(hashes)),
    )).all()
    vectors = {
        row.text_sha256: _validate_vector(np.frombuffer(row.vector, dtype=np.float32), row.dimension)
        for row in rows
    }
    missing_hashes = [key for key in hashes if key not in vectors]
    if missing_hashes:
        model = load_encoder()
        encoded = np.asarray(model.encode(
            [hashes[key] for key in missing_hashes],
            batch_size=64,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        ), dtype=np.float32)
        if encoded.shape != (len(missing_hashes), EMBEDDING_DIMENSION):
            raise ValueError(f"Unexpected embedding shape: {encoded.shape}")
        for text_hash, vector in zip(missing_hashes, encoded):
            vector = _validate_vector(vector, EMBEDDING_DIMENSION).copy()
            vectors[text_hash] = vector
            session.add(EmbeddingCache(
                text_sha256=text_hash,
                model_revision=MODEL_REVISION,
                vector=vector.tobytes(),
                dimension=EMBEDDING_DIMENSION,
            ))
        session.flush()
    return {hashes[text_hash]: vectors[text_hash] for text_hash in hashes}


def _validate_vector(vector: np.ndarray, dimension: int) -> np.ndarray:
    """Reject malformed or non-finite cache/model output and return float32 data."""
    result = np.asarray(vector, dtype=np.float32)
    if dimension != EMBEDDING_DIMENSION or result.shape != (EMBEDDING_DIMENSION,) or not np.isfinite(result).all():
        raise ValueError("Cached sentence vector has an invalid dimension or non-finite values.")
    return result


@dataclass(frozen=True)
class _AttendedText:
    member_id: str
    description: str
    start_time: datetime


def content_evidence_for_candidates(
    session: OrmSession,
    club_id: str,
    member_ids: Sequence[str],
    event_types: Sequence[EventType],
    cutoff: datetime,
) -> dict[str, dict[str, ContentSignal]]:
    """Build member profiles from attended descriptions strictly before cutoff and compare candidates."""
    if not embeddings_enabled():
        return {}
    if not member_ids or not event_types:
        return {}
    rows = session.execute(
        select(RSVP.member_id, Event.description, Event.start_time)
        .join(Event, Event.id == RSVP.event_id)
        .where(RSVP.member_id.in_(member_ids), Event.club_id == club_id, RSVP.attended.is_(True), Event.start_time < cutoff)
        .order_by(Event.start_time, RSVP.member_id)
    ).all()
    histories = [_AttendedText(member_id, description, stamp) for member_id, description, stamp in rows if description.strip()]
    all_texts = [row.description for row in histories] + [event_type.description for event_type in event_types if event_type.description.strip()]
    encoded = encode_and_cache(session, all_texts)
    target_vectors = {
        item.id: encoded[_normalized_text(item.description)]
        for item in event_types if _normalized_text(item.description)
    }
    by_member: dict[str, list[_AttendedText]] = {member_id: [] for member_id in member_ids}
    for row in histories:
        by_member[row.member_id].append(row)
    profiles: dict[str, tuple[np.ndarray, int]] = {}
    for member_id, member_rows in by_member.items():
        if not member_rows:
            continue
        ages = np.asarray([max(0.0, (cutoff - row.start_time).total_seconds() / 86400.0) for row in member_rows])
        weights = np.exp(-np.log(2.0) * ages / config.CONTENT_HALF_LIFE_DAYS)
        matrix = np.vstack([encoded[_normalized_text(row.description)] for row in member_rows])
        profile = np.average(matrix, axis=0, weights=weights).astype(np.float32)
        norm = float(np.linalg.norm(profile))
        if norm > 0:
            profiles[member_id] = (profile / norm, len(member_rows))
    result: dict[str, dict[str, ContentSignal]] = {}
    for event_type_id, target in target_vectors.items():
        signals = {}
        for member_id, (profile, observation_count) in profiles.items():
            cosine = float(np.clip(np.dot(profile, target), -1.0, 1.0))
            signals[member_id] = ContentSignal((cosine + 1.0) / 2.0, observation_count)
        result[event_type_id] = signals
    return result


def content_evidence_for_candidate(
    session: OrmSession,
    club_id: str,
    member_ids: Sequence[str],
    event_type_id: str,
    cutoff: datetime,
) -> dict[str, ContentSignal]:
    """Return the candidate-specific evidence mapping using the same leakage-safe profile path."""
    event_type = session.get(EventType, event_type_id)
    if event_type is None:
        return {}
    return content_evidence_for_candidates(session, club_id, member_ids, [event_type], cutoff).get(event_type_id, {})
