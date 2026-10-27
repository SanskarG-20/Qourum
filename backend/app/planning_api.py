"""Organizer-only API adapter for the pure local planning engine."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from .dependencies import AuthContext, ClubAccess, get_db, require_club_organizer, require_csrf
from .event_catalog import available_formats, is_online_venue
from .models import AcademicCalendar, Availability, ClubMember, Event, EventType, FairnessLedger, MemberSettings, Preference, RSVP
if (__package__ or "").partition(".")[0] == "app":
    from planning import config as planning_config
    from planning.models import AvailabilityWindow, PlanFormat, PlanMember, PlanObservation
    from planning.pipeline import build_plan
else:
    from backend.planning import config as planning_config
    from backend.planning.models import AvailabilityWindow, PlanFormat, PlanMember, PlanObservation
    from backend.planning.pipeline import build_plan

router = APIRouter(prefix="/api/clubs", tags=["planning"])
class PlanRequest(BaseModel):
    """Validated settings for a single planning pipeline request."""

    model_config = ConfigDict(extra="forbid")
    start_date: date | None = None
    horizon_days: int = Field(default=planning_config.DEFAULT_HORIZON_DAYS, ge=1, le=planning_config.MAX_HORIZON_DAYS)
    min_people_available: int = Field(default=planning_config.DEFAULT_MIN_PEOPLE_AVAILABLE, ge=1, le=200)
    strategy: Literal["average", "least_misery", "fairness_aware"] = "average"
    baseline: Literal["model", "random", "popularity", "repeat_last"] = "model"
    top_k: int = Field(default=planning_config.DEFAULT_TOP_K, ge=1, le=50)
    diversity: bool = True
    fairness: bool = False
    seed: int = Field(default=planning_config.DEFAULT_SEED, ge=0, le=2**32 - 1)
    selected_format_ids: list[str] = Field(default_factory=list, max_length=16)
    fee_policy: Literal["any", "free", "paid"] = "any"
    fee_cap_inr: int | None = Field(default=None, ge=0, le=100000)
    delivery_mode: Literal["any", "in_person", "online"] = "any"


def _time_block(value: time) -> str:
    if value < planning_config.TIME_BLOCK_BOUNDARIES[0]:
        return "morning"
    if value < planning_config.TIME_BLOCK_BOUNDARIES[1]:
        return "midday"
    if value < planning_config.TIME_BLOCK_BOUNDARIES[2]:
        return "afternoon"
    if value < planning_config.TIME_BLOCK_BOUNDARIES[3]:
        return "evening"
    return "late_evening"


def _plan_inputs(db: OrmSession, club_id: str, start_date: date):
    member_ids = list(db.scalars(
        select(ClubMember.member_id).where(ClubMember.club_id == club_id).order_by(ClubMember.member_id)
    ))
    if not member_ids:
        raise HTTPException(status_code=422, detail="This club has no members to plan for.")
    event_types = list(db.scalars(select(EventType).order_by(EventType.id)))
    pairs = available_formats(event_types)
    if not pairs:
        raise HTTPException(status_code=503, detail="No local event formats are available.")
    formats = [PlanFormat(
        format_id=event_format.id,
        name=event_format.name,
        event_type_id=parent.id,
        category=event_format.category,
        skill_level=event_format.skill_level,
        duration_minutes=event_format.duration_minutes or parent.default_duration_minutes,
        fee_inr=event_format.estimated_fee_inr,
        modes=event_format.modes,
        min_capacity=event_format.min_capacity,
        max_capacity=event_format.max_capacity,
    ) for event_format, parent in pairs]
    format_by_id = {item.format_id: item for item in formats}
    format_by_event_type = {}
    for event_format, parent in pairs:
        format_by_event_type.setdefault(parent.id, event_format.id)

    settings = {
        row.member_id: row for row in db.scalars(
            select(MemberSettings).where(MemberSettings.member_id.in_(member_ids))
        )
    }
    windows_by_member: dict[str, list[AvailabilityWindow]] = {member_id: [] for member_id in member_ids}
    for row in db.scalars(select(Availability).where(Availability.member_id.in_(member_ids))):
        windows_by_member[row.member_id].append(AvailabilityWindow(
            weekday=row.day_of_week,
            start=row.start_time,
            end=row.end_time,
            is_available=row.is_available,
            specific_date=row.specific_date,
        ))

    cutoff = datetime.combine(start_date, time.min)
    ledgers = {
        row.member_id: row for row in db.scalars(select(FairnessLedger).where(
            FairnessLedger.club_id == club_id,
            FairnessLedger.member_id.in_(member_ids),
            (FairnessLedger.updated_at.is_(None)) | (FairnessLedger.updated_at < cutoff),
        ))
    }
    recent_ratings: dict[str, list[tuple[float, float]]] = {member_id: [] for member_id in member_ids}
    rating_rows = db.execute(
        select(RSVP.member_id, RSVP.rating, Event.start_time)
        .join(Event, RSVP.event_id == Event.id)
        .where(RSVP.member_id.in_(member_ids), Event.club_id == club_id,
               Event.start_time < cutoff, RSVP.rating.is_not(None))
        .order_by(Event.start_time.desc())
    ).all()
    for member_id, rating, event_start in rating_rows:
        if len(recent_ratings[member_id]) < planning_config.FAIRNESS_RECENT_RATING_LIMIT:
            age_days = max(0.0, (cutoff - event_start).total_seconds() / 86400)
            decay = 2 ** (-age_days / planning_config.FAIRNESS_RATING_HALF_LIFE_DAYS)
            dissatisfaction = 1 - (int(rating) - 1) / 4
            recent_ratings[member_id].append((dissatisfaction, decay))

    members = []
    for member_id in member_ids:
        profile = settings.get(member_id)
        ledger = ledgers.get(member_id)
        if ledger is not None and ledger.satisfaction is not None:
            dissatisfaction = 1 - float(ledger.satisfaction)
        elif recent_ratings[member_id]:
            values = recent_ratings[member_id]
            dissatisfaction = sum(value * weight for value, weight in values) / sum(weight for _, weight in values)
        else:
            dissatisfaction = 0.0
        members.append(PlanMember(
            member_id=member_id,
            max_fee_inr=profile.max_fee_inr if profile is not None else None,
            mode_preference=(profile.mode_preference if profile and profile.mode_preference else "either"),
            availability=tuple(windows_by_member[member_id]),
            latest_start_time=profile.latest_start_time if profile is not None else None,
            recent_dissatisfaction=min(1.0, max(0.0, dissatisfaction)),
        ))

    history_events = db.execute(
        select(Event, RSVP.member_id, RSVP.attended, RSVP.rating)
        .join(RSVP, RSVP.event_id == Event.id)
        .where(Event.club_id == club_id, RSVP.member_id.in_(member_ids), Event.start_time < cutoff)
        .order_by(Event.start_time, RSVP.member_id)
    ).all()
    observations = []
    for event, member_id, attended, rating in history_events:
        format_id = event.event_format_id if event.event_format_id in format_by_id else format_by_event_type.get(event.event_type_id)
        if format_id is None:
            continue
        item = format_by_id[format_id]
        mode = event.delivery_mode if event.delivery_mode in {"in_person", "online"} else ("online" if is_online_venue(event.venue) else "in_person")
        observations.append(PlanObservation(
            member_id=member_id,
            format_id=format_id,
            time_block=_time_block(event.start_time.time()),
            fee_inr=event.estimated_fee_inr if event.estimated_fee_inr is not None else item.fee_inr,
            mode=mode,
            attended=bool(attended),
            rating=rating,
            timestamp=event.start_time,
        ))

    event_type_by_id = {item.id: item for item in event_types}
    explicit_preferences = {}
    for member_id, event_type_id, rating in db.execute(
        select(Preference.member_id, Preference.event_type_id, Preference.rating)
        .where(Preference.member_id.in_(member_ids))
    ):
        if event_type_id in event_type_by_id:
            for event_format, parent in pairs:
                if parent.id == event_type_id:
                    explicit_preferences[(member_id, event_format.id)] = (int(rating) - 1) / 4

    calendar_flags: dict[date, list[str]] = {}
    periods = db.scalars(select(AcademicCalendar).where(
        (AcademicCalendar.club_id == club_id) | AcademicCalendar.club_id.is_(None)
    ))
    for period in periods:
        if period.period_type not in {"holiday", "exam_week"}:
            continue
        day = period.start_date
        while day <= period.end_date:
            calendar_flags.setdefault(day, []).append(period.period_type)
            day = date.fromordinal(day.toordinal() + 1)
    return members, formats, observations, explicit_preferences, calendar_flags


@router.post("/{club_id}/plan")
def club_plan(
    club_id: str,
    payload: PlanRequest,
    _organizer: ClubAccess = Depends(require_club_organizer),
    _csrf: AuthContext = Depends(require_csrf),
    db: OrmSession = Depends(get_db),
) -> dict[str, object]:
    """Return ranked plan candidates and all candidates rejected by hard filters."""
    # Beginning tomorrow ensures every generated card can still be scheduled
    # if the organizer requests a plan later in the day.
    start_date = payload.start_date or date.today() + timedelta(days=1)
    members, formats, observations, preferences, calendar_flags = _plan_inputs(db, club_id, start_date)
    if payload.min_people_available > len(members):
        raise HTTPException(status_code=422, detail="Minimum available people cannot exceed club membership.")
    return build_plan(
        members=members,
        formats=formats,
        observations=observations,
        explicit_preferences=preferences,
        calendar_flags=calendar_flags,
        start_date=start_date,
        horizon_days=payload.horizon_days,
        min_people_available=payload.min_people_available,
        strategy=payload.strategy,
        fairness=payload.fairness,
        baseline=payload.baseline,
        top_k=payload.top_k,
        diversity=payload.diversity,
        seed=payload.seed,
        selected_format_ids=payload.selected_format_ids,
        fee_policy=payload.fee_policy,
        fee_cap_inr=payload.fee_cap_inr,
        delivery_mode=payload.delivery_mode,
        existing_events=[
            (event.start_time, event.start_time + timedelta(minutes=event.duration_minutes))
            for event in db.scalars(select(Event).where(
                Event.club_id == club_id, Event.status.in_(["proposed", "scheduled"])
            ))
        ],
    )
