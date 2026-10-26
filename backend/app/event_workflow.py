"""Event acceptance and member RSVP endpoints for the local club workflow."""

from datetime import datetime, timedelta
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from .dependencies import AuthContext, ClubAccess, get_db, require_club_member, require_club_organizer, require_csrf
from .models import Event, EventType, RSVP, utc_now
from .event_catalog import FORMAT_BY_ID, is_online_venue

router = APIRouter(prefix="/api/clubs", tags=["event-workflow"])


class CreateEventInput(BaseModel):
    """A selected recommendation accepted by a club organizer."""

    model_config = ConfigDict(extra="forbid")
    event_type_id: str = Field(min_length=1, max_length=36)
    start_time: datetime
    venue: str = Field(min_length=1, max_length=200)
    event_format_id: str | None = Field(default=None, max_length=64)
    delivery_mode: Literal["in_person", "online"] = "in_person"

    @field_validator("start_time")
    @classmethod
    def require_local_naive_future_time(cls, value: datetime) -> datetime:
        if value.tzinfo is not None:
            raise ValueError("Event start time must be a local timezone-free timestamp.")
        if value <= utc_now():
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
    event_format = FORMAT_BY_ID.get(payload.event_format_id) if payload.event_format_id else None
    if payload.event_format_id and (event_format is None or event_format.base_type_name != event_type.name):
        raise HTTPException(status_code=422, detail="Event format does not match its event type.")
    if event_format and payload.delivery_mode not in event_format.modes:
        raise HTTPException(status_code=422, detail="This event format does not support the selected delivery mode.")
    if payload.delivery_mode == "online" and not is_online_venue(payload.venue):
        raise HTTPException(status_code=422, detail="Online events need a virtual venue.")
    if payload.delivery_mode == "in_person" and is_online_venue(payload.venue):
        raise HTTPException(status_code=422, detail="In-person events need a physical venue.")
    duration_minutes = (event_format.duration_minutes if event_format else None) or event_type.default_duration_minutes
    end_time = payload.start_time + timedelta(minutes=duration_minutes)
    existing = db.scalars(select(Event).where(Event.club_id == club_id, Event.status.in_(["proposed", "scheduled"]))).all()
    if any(row.start_time < end_time and payload.start_time < row.start_time + timedelta(minutes=row.duration_minutes) for row in existing):
        raise HTTPException(status_code=409, detail="The selected time conflicts with an existing event.")
    event = Event(id=str(uuid4()), club_id=club_id, event_type_id=event_type.id,
                  title=event_format.name if event_format else event_type.name,
                  description=event_type.description, start_time=payload.start_time,
                  duration_minutes=duration_minutes, venue=payload.venue,
                  event_format_id=event_format.id if event_format else None,
                  delivery_mode=payload.delivery_mode,
                  estimated_fee_inr=event_format.estimated_fee_inr if event_format else None,
                  status="scheduled")
    db.add(event)
    db.commit()
    return {"id": event.id, "event_type_id": event.event_type_id, "title": event.title, "description": event.description, "start_time": event.start_time.isoformat(), "duration_minutes": event.duration_minutes, "venue": event.venue, "event_format_id": event.event_format_id, "delivery_mode": event.delivery_mode, "estimated_fee_inr": event.estimated_fee_inr, "status": event.status}


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
    if event.start_time <= utc_now() or event.status in {"completed", "cancelled"}:
        raise HTTPException(status_code=409, detail="RSVPs are closed for this event.")
    row = db.scalar(select(RSVP).where(RSVP.event_id == event_id, RSVP.member_id == access.user.id))
    if row is None:
        row = RSVP(id=str(uuid4()), event_id=event_id, member_id=access.user.id, status=payload.status, attended=False)
        db.add(row)
    else:
        row.status = payload.status
    db.commit()
    return {"event_id": event_id, "status": row.status}


@router.post("/{club_id}/events/{event_id}/cancel")
def cancel_event(
    club_id: str,
    event_id: str,
    _organizer: ClubAccess = Depends(require_club_organizer),
    _csrf: AuthContext = Depends(require_csrf),
    db: OrmSession = Depends(get_db),
) -> dict[str, str]:
    """Cancel an upcoming scheduled event so its slot can be recommended again."""
    event = db.get(Event, event_id)
    if event is None or event.club_id != club_id:
        raise HTTPException(status_code=404, detail="Event not found in this club.")
    if event.status not in {"proposed", "scheduled"} or event.start_time <= utc_now():
        raise HTTPException(status_code=409, detail="Only upcoming scheduled events can be cancelled.")
    event.status = "cancelled"
    db.commit()
    return {"event_id": event_id, "status": event.status}
