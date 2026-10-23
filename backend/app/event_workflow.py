"""Event acceptance and member RSVP endpoints for the local club workflow."""

from datetime import datetime, timedelta
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from .dependencies import AuthContext, ClubAccess, get_db, require_club_member, require_club_organizer, require_csrf
from .models import Event, EventType, RSVP

router = APIRouter(prefix="/api/clubs", tags=["event-workflow"])


class CreateEventInput(BaseModel):
    """A selected recommendation accepted by a club organizer."""

    model_config = ConfigDict(extra="forbid")
    event_type_id: str = Field(min_length=1, max_length=36)
    start_time: datetime
    venue: str = Field(min_length=1, max_length=200)

    @field_validator("start_time")
    @classmethod
    def require_local_naive_future_time(cls, value: datetime) -> datetime:
        if value.tzinfo is not None:
            raise ValueError("Event start time must be a local timezone-free timestamp.")
        if value <= datetime.utcnow():
            raise ValueError("An accepted recommendation must start in the future.")
        return value

    @field_validator("venue")
    @classmethod
    def trim_venue(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Venue cannot be empty.")
        return value


class RSVPInput(BaseModel):
    """A member's availability response for one scheduled event."""

    model_config = ConfigDict(extra="forbid")
    status: Literal["yes", "no", "maybe"]


@router.post("/{club_id}/events")
def accept_recommendation(
    club_id: str,
    payload: CreateEventInput,
    _organizer: ClubAccess = Depends(require_club_organizer),
    _csrf: AuthContext = Depends(require_csrf),
    db: OrmSession = Depends(get_db),
) -> dict[str, object]:
    """Accept a proposed slot as a scheduled club event after conflict checks."""
    event_type = db.get(EventType, payload.event_type_id)
    if event_type is None:
        raise HTTPException(status_code=422, detail="Unknown event type.")
    end_time = payload.start_time + timedelta(minutes=event_type.default_duration_minutes)
    existing = db.scalars(select(Event).where(Event.club_id == club_id, Event.status.in_(["proposed", "scheduled"]))).all()
    if any(row.start_time < end_time and payload.start_time < row.start_time + timedelta(minutes=row.duration_minutes) for row in existing):
        raise HTTPException(status_code=409, detail="The selected time conflicts with an existing event.")
    event = Event(id=str(uuid4()), club_id=club_id, event_type_id=event_type.id, title=event_type.name, start_time=payload.start_time, duration_minutes=event_type.default_duration_minutes, venue=payload.venue, status="scheduled")
    db.add(event)
    db.commit()
    return {"id": event.id, "event_type_id": event.event_type_id, "title": event.title, "start_time": event.start_time.isoformat(), "duration_minutes": event.duration_minutes, "venue": event.venue, "status": event.status}


@router.post("/{club_id}/events/{event_id}/rsvp")
def update_rsvp(
    club_id: str,
    event_id: str,
    payload: RSVPInput,
    access: ClubAccess = Depends(require_club_member),
    _csrf: AuthContext = Depends(require_csrf),
    db: OrmSession = Depends(get_db),
) -> dict[str, str]:
    """Create or replace the current member's RSVP for a future club event."""
    event = db.get(Event, event_id)
    if event is None or event.club_id != club_id:
        raise HTTPException(status_code=404, detail="Event not found in this club.")
    if event.start_time <= datetime.utcnow() or event.status in {"completed", "cancelled"}:
        raise HTTPException(status_code=409, detail="RSVPs are closed for this event.")
    row = db.scalar(select(RSVP).where(RSVP.event_id == event_id, RSVP.member_id == access.user.id))
    if row is None:
        row = RSVP(id=str(uuid4()), event_id=event_id, member_id=access.user.id, status=payload.status, attended=False)
        db.add(row)
    else:
        row.status = payload.status
    db.commit()
    return {"event_id": event_id, "status": row.status}
