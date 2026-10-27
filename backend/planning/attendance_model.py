"""Sparse, local logistic regression for observed member attendance."""

from __future__ import annotations

from typing import Mapping, Sequence

import numpy as np
from scipy.special import expit
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import LogisticRegression

from . import config
from .affinity import build_format_affinities
from .models import PlanCandidate, PlanFormat, PlanMember, PlanObservation


def _feature_row(member_id: str, format_id: str, category: str, skill: str, slot: str, fee: int, mode: str) -> dict[str, str | float]:
    return {
        "member": member_id,
        "format": format_id,
        "category": category,
        "skill": skill,
        "slot": slot,
        "mode": mode,
        "fee_scaled": fee / config.FEE_FEATURE_SCALE_INR,
    }


class LogisticAttendanceModel:
    """Fit seeded logistic attendance probabilities and retain affinity cold-starts."""

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.vectorizer = DictVectorizer(sparse=True, sort=True)
        self.estimator: LogisticRegression | None = None
        self.coefficients: dict[str, float] = {}
        self.intercept = 0.0

    @property
    def is_trained(self) -> bool:
        return self.estimator is not None

    def fit(self, observations: Sequence[PlanObservation], formats: Sequence[PlanFormat]) -> None:
        """Train only when history has at least two labels and both outcomes."""
        by_id = {item.format_id: item for item in formats}
        rows, labels = [], []
        for observation in observations:
            event_format = by_id.get(observation.format_id)
            if event_format is None:
                continue
            rows.append(_feature_row(
                observation.member_id, observation.format_id, event_format.category,
                event_format.skill_level, observation.time_block, observation.fee_inr, observation.mode,
            ))
            labels.append(int(observation.attended))
        if len(labels) < config.LOGISTIC_MIN_OBSERVATIONS or len(set(labels)) < config.LOGISTIC_REQUIRED_CLASSES:
            return
        matrix = self.vectorizer.fit_transform(rows)
        matrix.indices = matrix.indices.astype(np.int32, copy=False)
        matrix.indptr = matrix.indptr.astype(np.int32, copy=False)
        self.estimator = LogisticRegression(
            solver="liblinear", max_iter=100, random_state=self.seed, C=1.0,
        ).fit(matrix, np.asarray(labels, dtype=np.int8))
        self.coefficients = dict(zip(self.vectorizer.get_feature_names_out(), self.estimator.coef_[0].tolist()))
        self.intercept = float(self.estimator.intercept_[0])

    def predict(
        self,
        member_ids: Sequence[str],
        candidates: Sequence[PlanCandidate],
        formats: Sequence[PlanFormat],
        members: Sequence[PlanMember],
        observations: Sequence[PlanObservation],
        affinities: Mapping[tuple[str, str], object],
    ) -> np.ndarray:
        """Return candidate × member probabilities, using affinity for cold starts."""
        format_by_id = {item.format_id: item for item in formats}
        counts: dict[str, int] = {member_id: 0 for member_id in member_ids}
        positives = 0
        for item in observations:
            if item.member_id in counts:
                counts[item.member_id] += 1
            positives += int(item.attended)
        club_mean = (positives + config.BASELINE_PRIOR_COUNT * config.BASELINE_PRIOR_PROBABILITY) / (len(observations) + config.BASELINE_PRIOR_COUNT)
        format_ids = list(format_by_id)
        format_positions = {format_id: index for index, format_id in enumerate(format_ids)}
        affinity_matrix = np.asarray([
            [float(getattr(affinities[(member_id, format_id)], "probability", club_mean)) for member_id in member_ids]
            for format_id in format_ids
        ], dtype=np.float64)
        related_weights = np.asarray([
            min(config.FALLBACK_AFFINITY_EVIDENCE_CAP, int(getattr(affinities[(member_id, format_id)], "evidence_count", 0)))
            / (min(config.FALLBACK_AFFINITY_EVIDENCE_CAP, int(getattr(affinities[(member_id, format_id)], "evidence_count", 0))) + config.AFFINITY_DIRECT_PRIOR_COUNT)
            for format_id in format_ids for member_id in member_ids
        ], dtype=np.float64).reshape(len(format_ids), len(member_ids))
        fallback_by_format = club_mean + related_weights * (affinity_matrix - club_mean)
        candidate_format_positions = np.asarray([format_positions[item.format_id] for item in candidates], dtype=np.int32)
        probabilities = fallback_by_format[candidate_format_positions].copy()
        if self.is_trained:
            member_offsets = np.array([self.coefficients.get(f"member={member_id}", 0.0) for member_id in member_ids], dtype=np.float64)
            candidate_offsets = np.empty(len(candidates), dtype=np.float64)
            for index, candidate in enumerate(candidates):
                event_format = format_by_id[candidate.format_id]
                candidate_offsets[index] = (
                    self.intercept
                    + self.coefficients.get(f"format={candidate.format_id}", 0.0)
                    + self.coefficients.get(f"category={event_format.category}", 0.0)
                    + self.coefficients.get(f"skill={event_format.skill_level}", 0.0)
                    + self.coefficients.get(f"slot={candidate.time_block}", 0.0)
                    + self.coefficients.get(f"mode={candidate.mode}", 0.0)
                    + self.coefficients.get("fee_scaled", 0.0) * (candidate.fee_inr / config.FEE_FEATURE_SCALE_INR)
                )
            probabilities = expit(candidate_offsets[:, None] + member_offsets[None, :])
            cold_positions = [index for index, member_id in enumerate(member_ids)
                              if counts[member_id] < config.COLD_START_INTERACTION_THRESHOLD]
            probabilities[:, cold_positions] = fallback_by_format[candidate_format_positions][:, cold_positions]
        return np.clip(probabilities, 0.0, 1.0)

    def confidence(self, member_ids: Sequence[str], observations: Sequence[PlanObservation]) -> dict[str, str]:
        counts = {member_id: 0 for member_id in member_ids}
        for item in observations:
            if item.member_id in counts:
                counts[item.member_id] += 1
        return {
            member_id: "low" if count < config.COLD_START_INTERACTION_THRESHOLD
            else "medium" if count < config.HIGH_CONFIDENCE_INTERACTION_THRESHOLD else "high"
            for member_id, count in counts.items()
        }

