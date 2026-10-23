"""Database orchestration for the pure local recommendation pipeline."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from math import ceil
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

if __package__ == "app" or __package__.startswith("app."):
    from recsys.candidates import CalendarBlock, ScheduledBlock, assess_candidate, generate_candidates
    from recsys.group import FairnessRecord, fairness_weights, mmr_rerank, rank_group_candidates
    from recsys.individual import AttendanceObservation, TimeObservation, score_members
else:
    from backend.recsys.candidates import CalendarBlock, ScheduledBlock, assess_candidate, generate_candidates
    from backend.recsys.group import FairnessRecord, fairness_weights, mmr_rerank, rank_group_candidates
    from backend.recsys.individual import AttendanceObservation, TimeObservation, score_members
from .models import AcademicCalendar, Availability, ClubMember, Event, EventType, FairnessLedger, MemberSettings, Preference, RSVP


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

    rows = db.execute(
        select(RSVP.member_id, RSVP.status, RSVP.attended, Event.event_type_id, Event.start_time)
        .join(Event, Event.id == RSVP.event_id)
        .where(RSVP.member_id.in_(member_ids), Event.club_id == club_id, Event.start_time < datetime.combine(selected_date, time.min))
        .order_by(Event.start_time)
    ).all()
    attendance_history: dict[str, list[AttendanceObservation]] = {member_id: [] for member_id in member_ids}
    time_history: dict[str, list[TimeObservation]] = {member_id: [] for member_id in member_ids}
    for member_id, status, attended, event_type_id, event_start in rows:
        attendance_history[member_id].append(AttendanceObservation(event_type_id, status, attended, event_start))
        time_history[member_id].append(TimeObservation(event_start.weekday(), event_start.hour, attended))

    weekly_availability: dict[str, list[tuple[int, time, time]]] = {member_id: [] for member_id in member_ids}
    for row in db.scalars(select(Availability).where(Availability.member_id.in_(member_ids), Availability.day_of_week.is_not(None), Availability.is_available.is_(True))):
        weekly_availability[row.member_id].append((row.day_of_week, row.start_time, row.end_time))
    latest_start: dict[str, time | None] = {member_id: None for member_id in member_ids}
    for row in db.scalars(select(MemberSettings).where(MemberSettings.member_id.in_(member_ids))):
        latest_start[row.member_id] = row.latest_start_time

    calendar = [CalendarBlock(row.start_date, row.end_date, row.period_type) for row in db.scalars(select(AcademicCalendar).where((AcademicCalendar.club_id == club_id) | (AcademicCalendar.club_id.is_(None))))]
    events = [ScheduledBlock(row.start_time, row.duration_minutes, row.venue, row.status) for row in db.scalars(select(Event).where(Event.club_id == club_id, Event.start_time >= datetime.combine(selected_date, time.min), Event.start_time < datetime.combine(selected_date + timedelta(days=horizon_days), time.min)))]
    venues = sorted(set(db.scalars(select(Event.venue).where(Event.club_id == club_id)).all())) or ["Club Room"]
    ledger = {
        row.member_id: FairnessRecord(row.satisfaction, row.updated_at)
        for row in db.scalars(select(FairnessLedger).where(FairnessLedger.club_id == club_id))
    }

    candidates = generate_candidates([(event_type.id, event_type.default_duration_minutes) for event_type in event_types], start_date=selected_date, horizon_days=horizon_days, opening_hour=9, closing_hour=21, venues=venues)
    assessments = []
    satisfaction_rows = []
    cached_scores: dict[tuple[str, int, int], dict[str, float]] = {}
    now = datetime.combine(selected_date, time.min)
    popularity_counts: dict[str, int] = {event_type.id: 0 for event_type in event_types}
    for row in db.scalars(select(Event.event_type_id).where(Event.club_id == club_id)):
        popularity_counts[row] = popularity_counts.get(row, 0) + 1
    total_popularity = sum(popularity_counts.values()) or 1

    for candidate in candidates:
        cache_key = (candidate.event_type_id, candidate.start.weekday(), candidate.start.hour)
        if cache_key not in cached_scores:
            population_score = popularity_counts.get(candidate.event_type_id, 0) / total_popularity
            individual = score_members(member_ids, candidate.event_type_id, candidate.start.weekday(), candidate.start.hour, preferences, attendance_history, time_history, now=now, popularity_fallback=population_score)
            cached_scores[cache_key] = dict(zip(member_ids, (item.score for item in individual)))
        scores = cached_scores[cache_key]
        assessment = assess_candidate(candidate, scores, weekly_availability, existing_events=events, calendar_blocks=calendar, latest_start_times=latest_start, quorum=quorum)
        if not assessment.feasible:
            continue
        assessments.append(assessment)
        satisfaction_rows.append([scores[member_id] for member_id in member_ids])

    if not assessments:
        return {"recommendations": [], "candidate_count": len(candidates), "feasible_count": 0, "message": "No candidate met calendar, availability, and quorum constraints."}
    weights = fairness_weights(member_ids, ledger, now=now, enabled=fairness)
    rankings = rank_group_candidates(satisfaction_rows, strategy, member_weights=weights)
    event_type_ids = [assessment.candidate.event_type_id for assessment in assessments]
    selected = mmr_rerank(rankings, event_type_ids, top_n=top_n, recent_event_types=[row.event_type_id for row in db.scalars(select(Event).where(Event.club_id == club_id).order_by(Event.start_time.desc()).limit(3))] if diversity else (), relevance_weight=0.75 if diversity else 1.0)
    recommendations = []
    for rank, item in enumerate(selected, start=1):
        assessment = assessments[item.candidate_index]
        event_type = next(value for value in event_types if value.id == assessment.candidate.event_type_id)
        recommendations.append({
            "rank": rank,
            "event_type_id": event_type.id,
            "event_type": event_type.name,
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
        })
    return {"recommendations": recommendations, "candidate_count": len(candidates), "feasible_count": len(assessments), "strategy": strategy, "fairness": fairness, "diversity": diversity}
