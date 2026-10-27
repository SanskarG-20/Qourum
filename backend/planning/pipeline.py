"""Candidate → filter → probability → group aggregation → diversity pipeline."""

from __future__ import annotations

from datetime import date
from math import sqrt
from typing import Mapping, Sequence

import numpy as np

from . import config
from .affinity import build_format_affinities, confidence_label
from .aggregation import STRATEGIES
from .attendance_model import LogisticAttendanceModel
from .baselines import popularity_baseline, random_baseline, repeat_last_baseline
from .candidates import assess_candidate, build_availability_index, generate_candidates, member_unavailability_reasons
from .diversity import rerank_diverse
from .models import PlanFormat, PlanMember, PlanObservation

BASELINES = ("model", "random", "popularity", "repeat_last")


def _candidate_record(candidate, assessment, available_scores, confidence, group_score, summary, interval):
    member_satisfaction = {}
    for member_id in available_scores:
        member_satisfaction[member_id] = {
            "available": True,
            "satisfaction": round(float(available_scores[member_id]), 4),
            "confidence": confidence[member_id],
            "unavailable_reasons": [],
        }
    # All members are added by the caller below, including those filtered out.
    expected = round(sum(available_scores.values()), 3)
    return {
        "format_id": candidate.format_id,
        "event_type_id": candidate.event_type_id,
        "event_date": candidate.event_date.isoformat(),
        "time_block": candidate.time_block,
        "start": candidate.start.isoformat(),
        "mode": candidate.mode,
        "fee_inr": candidate.fee_inr,
        "capacity": candidate.capacity,
        "duration_minutes": candidate.duration_minutes,
        "category": candidate.category,
        "group_score": round(group_score, 4),
        "group_summary": {key: round(value, 4) for key, value in summary.items()},
        "expected_attendance": expected,
        "expected_attendance_interval_95": [round(interval[0], 3), round(interval[1], 3)],
        "per_member_satisfaction": member_satisfaction,
        "available_member_ids": list(assessment.available_member_ids),
        "confidence": "low",
        "why_line_inputs": {
            "format_name": candidate.format_id,
            "category": candidate.category,
            "skill_level": candidate.skill_level,
            "date": candidate.event_date.isoformat(),
            "time_block": candidate.time_block,
            "mode": candidate.mode,
            "fee_inr": candidate.fee_inr,
            "available_count": len(assessment.available_member_ids),
            "expected_attendance": expected,
            "expected_attendance_interval_95": [round(interval[0], 3), round(interval[1], 3)],
            "group_score": round(group_score, 4),
        },
    }


def build_plan(
    *,
    members: Sequence[PlanMember],
    formats: Sequence[PlanFormat],
    observations: Sequence[PlanObservation],
    explicit_preferences: Mapping[tuple[str, str], float] | None = None,
    calendar_flags: Mapping[date, Sequence[str]] | None = None,
    start_date: date,
    horizon_days: int = config.DEFAULT_HORIZON_DAYS,
    min_people_available: int = config.DEFAULT_MIN_PEOPLE_AVAILABLE,
    strategy: str = "average",
    baseline: str = "model",
    top_k: int = config.DEFAULT_TOP_K,
    diversity: bool = True,
    seed: int = config.DEFAULT_SEED,
) -> dict[str, object]:
    """Build a ranked plan with complete candidate rejection and member evidence."""
    if strategy not in STRATEGIES:
        raise ValueError(f"Unknown aggregation strategy: {strategy}")
    if baseline not in BASELINES:
        raise ValueError(f"Unknown baseline: {baseline}")
    if not 1 <= top_k <= 50:
        raise ValueError("top_k must be between 1 and 50")
    if len({item.member_id for item in members}) != len(members):
        raise ValueError("Member IDs must be unique")
    if len({item.format_id for item in formats}) != len(formats):
        raise ValueError("Format IDs must be unique")
    member_ids = [item.member_id for item in members]
    format_by_id = {item.format_id: item for item in formats}
    candidates = generate_candidates(formats, start_date, horizon_days)
    availability_index = build_availability_index(members)
    schedule_cache = {}
    eligibility_cache = {}
    assessments = [
        assess_candidate(candidate, members, calendar_flags or {}, min_people_available=min_people_available,
                         availability_index=availability_index, schedule_cache=schedule_cache,
                         eligibility_cache=eligibility_cache, include_member_details=False)
        for candidate in candidates
    ]
    rejected = []
    accepted_assessments = []
    for assessment in assessments:
        if assessment.accepted:
            accepted_assessments.append(assessment)
        else:
            candidate = assessment.candidate
            rejected.append({
                "format_id": candidate.format_id,
                "event_type_id": candidate.event_type_id,
                "event_date": candidate.event_date.isoformat(),
                "time_block": candidate.time_block,
                "start": candidate.start.isoformat(),
                "mode": candidate.mode,
                "fee_inr": candidate.fee_inr,
                "reason_codes": list(assessment.reason_codes),
                "available_member_count": len(assessment.available_member_ids),
                "unavailable_member_counts": dict(assessment.unavailable_reason_counts),
            })
    accepted_candidates = [item.candidate for item in accepted_assessments]
    if not accepted_assessments:
        return {
            "settings": {
                "start_date": start_date.isoformat(), "horizon_days": horizon_days,
                "min_people_available": min_people_available, "strategy": strategy,
                "baseline": baseline, "top_k": top_k, "diversity": diversity, "seed": seed,
            },
            "candidate_count": len(candidates), "feasible_count": 0,
            "recommendations": [], "rejected_candidates": rejected,
            "model_trained": False,
            "interval_method": "normal approximation to the Poisson-binomial attendance sum (95%)",
        }

    affinities = build_format_affinities(member_ids, formats, observations, explicit_preferences)
    model = LogisticAttendanceModel(seed=seed)
    model.fit(observations, formats)
    if baseline == "random":
        probability_matrix = random_baseline(member_ids, accepted_candidates, seed=seed)
        confidence = {member_id: "low" for member_id in member_ids}
    elif baseline == "popularity":
        probability_matrix = popularity_baseline(member_ids, accepted_candidates, observations)
        confidence = {member_id: confidence_label(sum(o.member_id == member_id for o in observations)) for member_id in member_ids}
    elif baseline == "repeat_last":
        probability_matrix = repeat_last_baseline(member_ids, accepted_candidates, observations)
        confidence = {member_id: confidence_label(sum(o.member_id == member_id for o in observations)) for member_id in member_ids}
    else:
        probability_matrix = model.predict(member_ids, accepted_candidates, formats, members, observations, affinities)
        confidence = model.confidence(member_ids, observations)

    dissatisfaction = {member.member_id: member.recent_dissatisfaction for member in members}
    member_positions_by_id = {member_id: index for index, member_id in enumerate(member_ids)}
    available_matrix = np.zeros((len(accepted_assessments), len(member_ids)), dtype=bool)
    for candidate_index, assessment in enumerate(accepted_assessments):
        positions = [member_positions_by_id[member_id] for member_id in assessment.available_member_ids]
        available_matrix[candidate_index, positions] = True
    available_counts = available_matrix.sum(axis=1)
    expected_values = np.sum(probability_matrix * available_matrix, axis=1)
    variances = np.sum(probability_matrix * (1.0 - probability_matrix) * available_matrix, axis=1)
    masked_values = np.where(available_matrix, probability_matrix, np.nan)
    group_means = np.nanmean(masked_values, axis=1)
    group_minima = np.nanmin(masked_values, axis=1)
    group_stds = np.nanstd(masked_values, axis=1)
    if strategy == "average":
        group_scores = group_means
    elif strategy == "least_misery":
        group_scores = group_minima
    else:
        weights = np.asarray([1 + dissatisfaction[member_id] for member_id in member_ids], dtype=np.float64)
        weighted = np.sum(probability_matrix * available_matrix * weights[None, :], axis=1)
        group_scores = weighted / np.sum(available_matrix * weights[None, :], axis=1)
    ranked = []
    for candidate_index, assessment in enumerate(accepted_assessments):
        group_score = float(group_scores[candidate_index])
        summary = {"mean": float(group_means[candidate_index]), "minimum": float(group_minima[candidate_index]),
                   "standard_deviation": float(group_stds[candidate_index])}
        expected = float(expected_values[candidate_index])
        margin = config.ATTENDANCE_INTERVAL_Z * sqrt(float(variances[candidate_index]))
        interval = (max(0.0, expected - margin), min(float(available_counts[candidate_index]), expected + margin))
        candidate = assessment.candidate
        ranked.append((candidate_index, group_score, candidate.category, summary, expected, interval))

    ranked.sort(key=lambda item: (-item[1], accepted_assessments[item[0]].candidate.start,
                                  accepted_assessments[item[0]].candidate.format_id,
                                  accepted_assessments[item[0]].candidate.mode))
    indices = list(range(len(ranked)))
    group_scores = [item[1] for item in ranked]
    categories = [item[2] for item in ranked]
    selected_indices = (
        rerank_diverse(indices, group_scores, categories, top_k=top_k)
        if diversity else indices[:top_k]
    )
    results = []
    for selected_index in selected_indices:
        candidate_index, group_score, _category, summary, expected, interval = ranked[selected_index]
        assessment = accepted_assessments[candidate_index]
        candidate = assessment.candidate
        available = set(assessment.available_member_ids)
        scores = {
            member_id: float(probability_matrix[candidate_index, member_index])
            for member_index, member_id in enumerate(member_ids) if member_id in available
        }
        record = _candidate_record(candidate, assessment, scores, confidence, group_score, summary, interval)
        record["why_line_inputs"]["format_name"] = format_by_id[candidate.format_id].name
        for member in members:
            if member.member_id not in scores:
                reasons = member_unavailability_reasons(member, candidate, availability_index)
                record["per_member_satisfaction"][member.member_id] = {
                    "available": False, "satisfaction": None, "confidence": confidence[member.member_id],
                    "unavailable_reasons": list(reasons),
                }
        if baseline == "model":
            statuses = [confidence[item] for item in scores]
            low_fraction = statuses.count("low") / max(1, len(statuses))
            record["confidence"] = "low" if low_fraction >= 0.5 else "medium" if "medium" in statuses else "high"
        else:
            record["confidence"] = "low"
        record["why_line_inputs"]["strategy"] = strategy
        record["why_line_inputs"]["baseline"] = baseline
        record["why_line_inputs"]["confidence"] = record["confidence"]
        results.append(record)
    return {
        "settings": {
            "start_date": start_date.isoformat(), "horizon_days": horizon_days,
            "min_people_available": min_people_available, "strategy": strategy,
            "baseline": baseline, "top_k": top_k, "diversity": diversity, "seed": seed,
        },
        "candidate_count": len(candidates),
        "feasible_count": len(accepted_assessments),
        "recommendations": results,
        "rejected_candidates": rejected,
        "model_trained": model.is_trained,
        "interval_method": "normal approximation to the Poisson-binomial attendance sum (95%)",
    }
