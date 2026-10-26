"""Database orchestration for the pure local recommendation pipeline."""

from __future__ import annotations

from dataclasses import replace
from datetime import date, datetime, time, timedelta
from math import ceil
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

if (__package__ or "").partition(".")[0] == "app":
    from recsys.candidates import CalendarBlock, ScheduledBlock, assess_candidate, generate_candidates
    from recsys.group import FairnessRecord, fairness_weights, mmr_rerank, rank_group_candidates
    from recsys.individual import AttendanceObservation, TimeObservation, club_attendance_fallback, score_members
    from recsys.explanations import counterfactual_evidence, factor_summary, render_counterfactual, render_explanation
else:
    from backend.recsys.candidates import CalendarBlock, ScheduledBlock, assess_candidate, generate_candidates
    from backend.recsys.group import FairnessRecord, fairness_weights, mmr_rerank, rank_group_candidates
    from backend.recsys.individual import AttendanceObservation, TimeObservation, club_attendance_fallback, score_members
    from backend.recsys.explanations import counterfactual_evidence, factor_summary, render_counterfactual, render_explanation
from .models import AcademicCalendar, Availability, ClubMember, Event, EventType, FairnessLedger, MemberSettings, Preference, RSVP
from .event_catalog import FORMAT_BY_ID, available_formats, is_online_venue
from .embedding_service import content_evidence_for_candidates, embeddings_enabled


def load_attendance_rows_before(db: OrmSession, club_id: str, member_ids: list[str], cutoff: datetime):
    """Load member events strictly before a temporal recommendation cutoff."""
    return db.execute(
        select(RSVP.member_id, RSVP.event_id, RSVP.status, RSVP.attended, Event.event_type_id, Event.start_time)
        .join(Event, Event.id == RSVP.event_id)
        .where(RSVP.member_id.in_(member_ids), Event.club_id == club_id, Event.start_time < cutoff)
        .order_by(Event.start_time)
    ).all()


def load_fairness_records_before(db: OrmSession, club_id: str, cutoff: datetime) -> dict[str, FairnessRecord]:
    """Load only ledger values visible at the same temporal recommendation cutoff."""
    return {
        row.member_id: FairnessRecord(row.satisfaction, row.updated_at)
        for row in db.scalars(select(FairnessLedger).where(
            FairnessLedger.club_id == club_id,
            (FairnessLedger.updated_at.is_(None)) | (FairnessLedger.updated_at <= cutoff),
        ))
    }


def recommend_for_club(
    db: OrmSession,
    club_id: str,
    *,
    strategy: str,
    top_n: int,
    quorum: int | None,
    horizon_days: int,
    fairness: bool,
    diversity: bool,
    anchor_date: date | None = None,
    format_ids: list[str] | None = None,
    fee_policy: str = "any",
    max_fee_inr: int | None = None,
    delivery_mode: str = "any",
) -> dict[str, Any]:
    """Load club evidence and return stable top-ranked feasible candidates."""
    selected_date = anchor_date or date.today()
    member_ids = list(db.scalars(select(ClubMember.member_id).where(ClubMember.club_id == club_id).order_by(ClubMember.member_id)))
    event_types = list(db.scalars(select(EventType).order_by(EventType.id)))
    if not member_ids or not event_types:
        return {"recommendations": [], "candidate_count": 0, "feasible_count": 0, "message": "Club has no members or event types."}

    preferences: dict[str, dict[str, int]] = {member_id: {} for member_id in member_ids}
    for member_id, event_type_id, rating in db.execute(select(Preference.member_id, Preference.event_type_id, Preference.rating).where(Preference.member_id.in_(member_ids))):
        preferences[member_id][event_type_id] = rating

    cutoff = datetime.combine(selected_date, time.min)
    now = cutoff
    rows = load_attendance_rows_before(db, club_id, member_ids, cutoff)
    attendance_history: dict[str, list[AttendanceObservation]] = {member_id: [] for member_id in member_ids}
    time_history: dict[str, list[TimeObservation]] = {member_id: [] for member_id in member_ids}
    outcomes_by_type: dict[str, tuple[int, int]] = {}
    for member_id, _event_id, status, attended, event_type_id, event_start in rows:
        type_attended, type_observed = outcomes_by_type.get(event_type_id, (0, 0))
        outcomes_by_type[event_type_id] = (type_attended + int(bool(attended)), type_observed + 1)
        attendance_history[member_id].append(AttendanceObservation(event_type_id, status, attended, event_start))
        time_history[member_id].append(TimeObservation(event_start.weekday(), event_start.hour, attended))

    content_by_type = content_evidence_for_candidates(db, club_id, member_ids, event_types, cutoff) if embeddings_enabled() else {}

    weekly_availability: dict[str, list[tuple[int, time, time]]] = {member_id: [] for member_id in member_ids}
    for row in db.scalars(select(Availability).where(Availability.member_id.in_(member_ids), Availability.day_of_week.is_not(None), Availability.is_available.is_(True))):
        weekly_availability[row.member_id].append((row.day_of_week, row.start_time, row.end_time))
    latest_start: dict[str, time | None] = {member_id: None for member_id in member_ids}
    for row in db.scalars(select(MemberSettings).where(MemberSettings.member_id.in_(member_ids))):
        latest_start[row.member_id] = row.latest_start_time

    calendar = [CalendarBlock(row.start_date, row.end_date, row.period_type) for row in db.scalars(select(AcademicCalendar).where((AcademicCalendar.club_id == club_id) | (AcademicCalendar.club_id.is_(None))))]
    events = [ScheduledBlock(row.start_time, row.duration_minutes, row.venue, row.status) for row in db.scalars(select(Event).where(Event.club_id == club_id, Event.start_time >= datetime.combine(selected_date, time.min), Event.start_time < datetime.combine(selected_date + timedelta(days=horizon_days), time.min)))]
    venues = sorted(set(db.scalars(select(Event.venue).where(Event.club_id == club_id)).all())) or ["Club Room"]
    ledger = load_fairness_records_before(db, club_id, now)

    format_pairs = available_formats(event_types)
    requested_ids = set(format_ids or ())
    has_requirements = bool(requested_ids or fee_policy != "any" or max_fee_inr is not None or delivery_mode != "any")
    if has_requirements:
        candidates = []
        for event_format, parent in format_pairs:
            if requested_ids and event_format.id not in requested_ids:
                continue
            if fee_policy == "free" and event_format.estimated_fee_inr != 0:
                continue
            if fee_policy == "paid" and event_format.estimated_fee_inr == 0:
                continue
            if max_fee_inr is not None and event_format.estimated_fee_inr > max_fee_inr:
                continue
            for mode in event_format.modes:
                if delivery_mode != "any" and mode != delivery_mode:
                    continue
                mode_venues = ["Online"] if mode == "online" else [venue for venue in venues if not is_online_venue(venue)] or ["Club Room"]
                generated = generate_candidates(
                    [(parent.id, event_format.duration_minutes or parent.default_duration_minutes)],
                    start_date=selected_date, horizon_days=horizon_days, opening_hour=9,
                    closing_hour=21, venues=mode_venues,
                )
                candidates.extend(replace(candidate, format_id=event_format.id, delivery_mode=mode,
                                          estimated_fee_inr=event_format.estimated_fee_inr) for candidate in generated)
        candidates.sort()
    else:
        base_formats = {parent.id: event_format for event_format, parent in format_pairs if event_format.name == parent.name}
        generated = generate_candidates([(event_type.id, event_type.default_duration_minutes) for event_type in event_types], start_date=selected_date, horizon_days=horizon_days, opening_hour=9, closing_hour=21, venues=venues)
        candidates = [replace(candidate, format_id=base_formats[candidate.event_type_id].id,
                              delivery_mode="online" if is_online_venue(candidate.venue) else "in_person",
                              estimated_fee_inr=base_formats[candidate.event_type_id].estimated_fee_inr)
                      if candidate.event_type_id in base_formats else candidate for candidate in generated]
    had_time_slots = bool(candidates)
    if anchor_date is None:
        current_time = datetime.now()
        candidates = [candidate for candidate in candidates if candidate.start > current_time]
    if not candidates:
        return {"recommendations": [], "candidate_count": 0, "feasible_count": 0,
                "message": "No future time slots remain in this search. Look farther ahead." if had_time_slots
                           else "No event formats match these requirements. Try a different format, fee, or delivery choice."}
    assessments = []
    satisfaction_rows = []
    component_rows: list[dict[str, float | None]] = []
    cached_scores: dict[tuple[str, int, int], dict[str, float]] = {}
    component_cache: dict[tuple[str, int, int], dict[str, float | None]] = {}
    availability_cache: dict = {}

    for candidate in candidates:
        cache_key = (candidate.event_type_id, candidate.start.weekday(), candidate.start.hour)
        if cache_key not in cached_scores:
            population_score = club_attendance_fallback(outcomes_by_type, candidate.event_type_id)
            individual = score_members(member_ids, candidate.event_type_id, candidate.start.weekday(), candidate.start.hour, preferences, attendance_history, time_history, now=now, popularity_fallback=population_score, content_evidence=content_by_type.get(candidate.event_type_id))
            cached_scores[cache_key] = dict(zip(member_ids, (item.score for item in individual)))
            component_cache[cache_key] = {
                name: (sum(values) / len(values) if values else None)
                for name, values in {
                    "explicit_rating": [item.explicit_rating for item in individual if item.explicit_rating is not None],
                    "implicit_attendance": [item.implicit_attendance for item in individual if item.implicit_attendance is not None],
                    "time_affinity": [item.time_affinity for item in individual if item.time_affinity is not None],
                    "content_similarity": [item.content_similarity for item in individual if item.content_similarity is not None],
                }.items()
            }
        scores = cached_scores[cache_key]
        assessment = assess_candidate(candidate, scores, weekly_availability, existing_events=events, calendar_blocks=calendar, latest_start_times=latest_start, quorum=quorum, availability_cache=availability_cache)
        if not assessment.feasible:
            continue
        assessments.append(assessment)
        satisfaction_rows.append([scores[member_id] for member_id in member_ids])
        component_rows.append(component_cache[cache_key])

    if not assessments:
        return {"recommendations": [], "candidate_count": len(candidates), "feasible_count": 0, "message": "No candidate met calendar, availability, and quorum constraints."}
    weights = fairness_weights(member_ids, ledger, now=now, enabled=fairness)
    rankings = rank_group_candidates(satisfaction_rows, strategy, member_weights=weights)
    event_type_ids = [assessment.candidate.event_type_id for assessment in assessments]
    selected = mmr_rerank(rankings, event_type_ids, top_n=min(len(rankings), top_n * max(1, len(venues))) if has_requirements else top_n, recent_event_types=[row.event_type_id for row in db.scalars(select(Event).where(Event.club_id == club_id).order_by(Event.start_time.desc()).limit(3))] if diversity else (), relevance_weight=0.75 if diversity else 1.0)
    if has_requirements:
        distinct = []
        seen_slots = set()
        for item in selected:
            candidate = assessments[item.candidate_index].candidate
            key = (candidate.format_id, candidate.start, candidate.delivery_mode)
            if key in seen_slots:
                continue
            seen_slots.add(key)
            distinct.append(item)
            if len(distinct) == top_n:
                break
        selected = distinct
    recommendations = []
    counterfactuals = []
    event_type_by_id = {value.id: value for value in event_types}
    for rank, item in enumerate(selected, start=1):
        assessment = assessments[item.candidate_index]
        event_type = event_type_by_id[assessment.candidate.event_type_id]
        selected_format = FORMAT_BY_ID.get(assessment.candidate.format_id)
        selected_name = selected_format.name if selected_format else event_type.name
        factors = factor_summary(component_rows[item.candidate_index])
        evidence = {
            "strategy": strategy,
            "strategy_score": round(item.strategy_score, 3),
            "group_mean": round(item.group_mean, 3),
            "group_min": round(item.group_min, 3),
            "group_std": round(item.group_std, 3),
            "top_factors": factors,
            "component_means": dict(component_rows[item.candidate_index]),
            "per_member_satisfaction": {member_id: round(value, 3) for member_id, value in zip(member_ids, item.satisfactions)},
            "constraint_status": {
                "feasible": assessment.feasible,
                "reason_codes": list(assessment.reason_codes),
                "availability_fraction": round(assessment.availability_fraction, 3),
                "expected_attendance": round(assessment.expected_attendance, 2),
                "quorum_required": assessment.quorum_required,
            },
            "planning_requirements": {
                "format_id": assessment.candidate.format_id,
                "delivery_mode": assessment.candidate.delivery_mode,
                "estimated_fee_inr": assessment.candidate.estimated_fee_inr,
                "fees_are_synthetic_estimates": True,
            },
        }
        alternatives = []
        for alternative in rankings:
            if alternative.candidate_index == item.candidate_index or alternative.strategy_score >= item.strategy_score:
                continue
            alt_assessment = assessments[alternative.candidate_index]
            alt_type = event_type_by_id[alt_assessment.candidate.event_type_id]
            alt_format = FORMAT_BY_ID.get(alt_assessment.candidate.format_id)
            alt_factors = component_rows[alternative.candidate_index]
            comparison = counterfactual_evidence(
                f"{selected_name} at {assessment.candidate.start.isoformat()}", item.strategy_score,
                {key: value for key, value in component_rows[item.candidate_index].items() if value is not None},
                f"{alt_format.name if alt_format else alt_type.name} at {alt_assessment.candidate.start.isoformat()}", alternative.strategy_score,
                {key: value for key, value in alt_factors.items() if value is not None},
            )
            alternatives.append({"evidence": comparison, "text": render_counterfactual(comparison)})
            if len(alternatives) == 3:
                break
        result = {
            "rank": rank,
            "event_type_id": event_type.id,
            "event_type": selected_name,
            "event_format_id": assessment.candidate.format_id,
            "delivery_mode": assessment.candidate.delivery_mode,
            "estimated_fee_inr": assessment.candidate.estimated_fee_inr,
            "fees_are_synthetic_estimates": True,
            "start": assessment.candidate.start.isoformat(),
            "duration_minutes": assessment.candidate.duration_minutes,
            "venue": assessment.candidate.venue,
            "strategy_score": item.strategy_score,
            "group_mean": item.group_mean,
            "group_min": item.group_min,
            "group_std": item.group_std,
            "satisfaction": dict(zip(member_ids, item.satisfactions)),
            "available_members": list(assessment.available_members),
            "availability_fraction": assessment.availability_fraction,
            "expected_attendance": assessment.expected_attendance,
            "quorum_required": assessment.quorum_required,
            "evidence": evidence,
            "explanation": render_explanation(evidence),
            "why_not": alternatives,
        }
        recommendations.append(result)
        counterfactuals.extend(alternatives)
    return {"recommendations": recommendations, "counterfactuals": counterfactuals, "candidate_count": len(candidates), "feasible_count": len(assessments), "strategy": strategy, "fairness": fairness, "diversity": diversity}
