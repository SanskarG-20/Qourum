"""Club-scoped read endpoints with mandatory membership and role checks."""

from datetime import date, time
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session as OrmSession

from .dependencies import AuthContext, ClubAccess, get_auth_context, get_db, require_club_member, require_club_organizer, require_csrf
from .models import Availability, Club, Event, EventType, MemberSettings, Preference, RSVP
from .repositories import get_club_members, list_events

router = APIRouter(prefix="/api/clubs", tags=["clubs"])


class WeeklyWindow(BaseModel):
    """One normalized weekly availability interval (Monday is day zero)."""

    model_config = ConfigDict(extra="forbid")
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def ordered(self) -> "WeeklyWindow":
        if self.start_time >= self.end_time:
            raise ValueError("Availability must end after it starts.")
        return self


class RatingInput(BaseModel):
    """An explicit preference rating for one event type."""

    model_config = ConfigDict(extra="forbid")
    event_type_id: str = Field(min_length=1, max_length=36)
    rating: int = Field(ge=1, le=5)


class OnboardingInput(BaseModel):
    """Validated complete onboarding state for one member."""

    model_config = ConfigDict(extra="forbid")
    preferences: list[RatingInput] = Field(max_length=12)
    availability: list[WeeklyWindow] = Field(max_length=84)
    latest_start_time: time | None = None

    @field_validator("preferences")
    @classmethod
    def unique_event_types(cls, values: list[RatingInput]) -> list[RatingInput]:
        if len({value.event_type_id for value in values}) != len(values):
            raise ValueError("Each event type can be rated only once.")
        return values

    @field_validator("availability")
    @classmethod
    def non_overlapping_windows(cls, values: list[WeeklyWindow]) -> list[WeeklyWindow]:
        by_day: dict[int, list[WeeklyWindow]] = {}
        for value in values:
            by_day.setdefault(value.day_of_week, []).append(value)
        for day_windows in by_day.values():
            ordered = sorted(day_windows, key=lambda value: value.start_time)
            if any(left.end_time > right.start_time for left, right in zip(ordered, ordered[1:])):
                raise ValueError("Weekly availability windows may not overlap.")
        return values


def _onboarding_payload(db: OrmSession, member_id: str, club_id: str) -> dict[str, object]:
    preferences = db.scalars(select(Preference).where(Preference.member_id == member_id)).all()
    windows = db.scalars(select(Availability).where(Availability.member_id == member_id, Availability.day_of_week.is_not(None)).order_by(Availability.day_of_week, Availability.start_time)).all()
    settings = db.get(MemberSettings, member_id)
    attended_count = db.scalar(
        select(func.count(RSVP.id)).join(Event, Event.id == RSVP.event_id)
        .where(RSVP.member_id == member_id, RSVP.attended.is_(True), Event.club_id == club_id)
    ) or 0
    is_cold_start = not preferences or attended_count < 3
    event_types = db.scalars(select(EventType).order_by(EventType.name)).all()
    total_events = db.scalar(select(func.count(Event.id)).where(Event.club_id == club_id)) or 0
    popularity = []
    for event_type in event_types:
        count = db.scalar(select(func.count(Event.id)).where(Event.club_id == club_id, Event.event_type_id == event_type.id)) or 0
        popularity.append({"event_type_id": event_type.id, "name": event_type.name, "score": count / total_events if total_events else 0.0})
    return {
        "preferences": [{"event_type_id": value.event_type_id, "rating": value.rating} for value in preferences],
        "availability": [{"day_of_week": value.day_of_week, "start_time": value.start_time.strftime("%H:%M"), "end_time": value.end_time.strftime("%H:%M")} for value in windows],
        "latest_start_time": settings.latest_start_time.strftime("%H:%M") if settings and settings.latest_start_time else None,
        "is_cold_start": is_cold_start,
        "fallback_popularity": popularity if is_cold_start else [],
        "event_types": [{"id": value.id, "name": value.name, "category": value.category} for value in event_types],
    }


@router.get("/{club_id}/onboarding")
def get_onboarding(access: ClubAccess = Depends(require_club_member), db: OrmSession = Depends(get_db)) -> dict[str, object]:
    """Return the caller's onboarding state and the explicit cold-start fallback."""
    return _onboarding_payload(db, access.user.id, access.club_id)


@router.put("/{club_id}/onboarding")
def save_onboarding(
    club_id: str,
    payload: OnboardingInput,
    access: ClubAccess = Depends(require_club_member),
    _csrf: AuthContext = Depends(require_csrf),
    db: OrmSession = Depends(get_db),
) -> dict[str, object]:
    """Replace preferences, weekly availability, and scheduling dealbreakers."""
    valid_type_ids = set(db.scalars(select(EventType.id)).all())
    if any(value.event_type_id not in valid_type_ids for value in payload.preferences):
        raise HTTPException(status_code=422, detail="Unknown event type.")
    member_id = access.user.id
    db.execute(delete(Preference).where(Preference.member_id == member_id))
    db.execute(delete(Availability).where(Availability.member_id == member_id, Availability.day_of_week.is_not(None)))
    db.add_all([Preference(id=str(uuid4()), member_id=member_id, event_type_id=value.event_type_id, rating=value.rating) for value in payload.preferences])
    db.add_all([Availability(id=str(uuid4()), member_id=member_id, day_of_week=value.day_of_week, specific_date=None, start_time=value.start_time, end_time=value.end_time, is_available=True) for value in payload.availability])
    settings = db.get(MemberSettings, member_id)
    if settings is None:
        settings = MemberSettings(member_id=member_id)
        db.add(settings)
    settings.latest_start_time = payload.latest_start_time
    db.commit()
    return _onboarding_payload(db, member_id, club_id)


@router.get("/{club_id}/events")
def club_events(
    access: ClubAccess = Depends(require_club_member),
    db: OrmSession = Depends(get_db),
) -> list[dict[str, object]]:
    """List events visible to a current club member or organizer."""
    return [
        {
            "id": event.id,
            "event_type_id": event.event_type_id,
            "title": event.title,
            "description": event.description,
            "start_time": event.start_time.isoformat(),
            "duration_minutes": event.duration_minutes,
            "venue": event.venue,
            "status": event.status,
            "my_rsvp": db.scalar(select(RSVP.status).where(RSVP.event_id == event.id, RSVP.member_id == access.user.id)),
        }
        for event in list_events(db, access.club_id)
    ]


@router.get("/{club_id}/members")
def club_members(
    access: ClubAccess = Depends(require_club_organizer),
    db: OrmSession = Depends(get_db),
) -> list[dict[str, str]]:
    """List member contact details for organizers of the specified club."""
    return [
        {"id": user.id, "name": user.name, "email": user.email, "role": role}
        for user, role in get_club_members(db, access.club_id)
    ]


@router.get("/{club_id}")
def club_detail(
    access: ClubAccess = Depends(require_club_member),
    db: OrmSession = Depends(get_db),
) -> dict[str, str]:
    """Return a club's basic details to a current member or organizer."""
    club = db.get(Club, access.club_id)
    if club is None:
        raise HTTPException(status_code=404, detail="Club not found.")
    return {"id": club.id, "name": club.name, "description": club.description}
