"""Organizer feedback API and chronological fairness-ledger updates."""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session as OrmSession

from .dependencies import AuthContext, ClubAccess, get_db, require_club_organizer, require_csrf
from .models import ClubMember, Event, FairnessLedger, RSVP

router = APIRouter(prefix="/api/clubs", tags=["feedback"])


class AttendanceFeedback(BaseModel):
    """One member's actual attendance and optional attended-event rating."""

    model_config = ConfigDict(extra="forbid")
    member_id: str = Field(min_length=1, max_length=36)
    attended: bool
    rating: int | None = Field(default=None, ge=1, le=5)

    @field_validator("rating")
    @classmethod
    def rating_requires_attendance(cls, value: int | None, info):
        if value is not None and info.data.get("attended") is False:
            raise ValueError("Ratings can only be recorded for members who attended.")
        return value


class EventFeedback(BaseModel):
    """Complete actual-attendance roster for one event."""

    model_config = ConfigDict(extra="forbid")
    attendees: list[AttendanceFeedback] = Field(min_length=1, max_length=1000)

    @field_validator("attendees")
    @classmethod
    def unique_members(cls, values: list[AttendanceFeedback]) -> list[AttendanceFeedback]:
        if len({value.member_id for value in values}) != len(values):
            raise ValueError("Each club member may appear only once.")
        return values


def record_event_feedback(db: OrmSession, club_id: str, event_id: str, payload: EventFeedback, *, now: datetime | None = None) -> dict[str, object]:
    """Persist completed attendance and update each member's fairness evidence."""
    event = db.get(Event, event_id)
    if event is None or event.club_id != club_id:
        raise HTTPException(status_code=404, detail="Event not found in this club.")
    current_time = now or datetime.utcnow()
    if event.start_time > current_time:
        raise HTTPException(status_code=409, detail="Attendance cannot be recorded before the event starts.")
    if event.status == "cancelled":
        raise HTTPException(status_code=409, detail="Cancelled events cannot receive attendance feedback.")
    member_ids = {row.member_id for row in db.scalars(select(ClubMember).where(ClubMember.club_id == club_id))}
    if any(item.member_id not in member_ids for item in payload.attendees):
        raise HTTPException(status_code=422, detail="Every attendee must be a member of this club.")
    if {item.member_id for item in payload.attendees} != member_ids:
        raise HTTPException(status_code=422, detail="Feedback must include every club member's attendance status.")
    existing_rsvps = {
        row.member_id: row
        for row in db.scalars(select(RSVP).where(RSVP.event_id == event_id, RSVP.member_id.in_([item.member_id for item in payload.attendees])))
    }
    ledgers = {
        row.member_id: row
        for row in db.scalars(select(FairnessLedger).where(FairnessLedger.club_id == club_id, FairnessLedger.member_id.in_([item.member_id for item in payload.attendees])))
    }
    if any(ledgers.get(item.member_id) and ledgers[item.member_id].updated_at and ledgers[item.member_id].updated_at > event.start_time for item in payload.attendees):
        raise HTTPException(status_code=409, detail="Feedback must be applied in chronological event order.")

    for item in payload.attendees:
        row = existing_rsvps.get(item.member_id)
        if row is None:
            row = RSVP(id=str(uuid4()), event_id=event_id, member_id=item.member_id, status="yes" if item.attended else "no", attended=item.attended)
            db.add(row)
        row.attended = item.attended
        row.rating = item.rating
        satisfaction = (item.rating - 1) / 4 if item.rating is not None else (0.6 if item.attended else 0.0)
        ledger = ledgers.get(item.member_id)
        if ledger is None:
            ledger = FairnessLedger(id=str(uuid4()), club_id=club_id, member_id=item.member_id, satisfaction=satisfaction, low_satisfaction_count=int(satisfaction < 0.5), updated_at=event.start_time)
            db.add(ledger)
        else:
            ledger.satisfaction = satisfaction
            ledger.low_satisfaction_count += int(satisfaction < 0.5)
            ledger.updated_at = event.start_time
    event.status = "completed"
    db.commit()
    return {"event_id": event.id, "status": event.status, "recorded_members": len(payload.attendees), "updated_at": event.start_time.isoformat()}


@router.post("/{club_id}/events/{event_id}/feedback")
def submit_feedback(
    club_id: str,
    event_id: str,
    payload: EventFeedback,
    _organizer: ClubAccess = Depends(require_club_organizer),
    _csrf: AuthContext = Depends(require_csrf),
    db: OrmSession = Depends(get_db),
) -> dict[str, object]:
    """Record an event's attendance and participant satisfaction after it occurs."""
    return record_event_feedback(db, club_id, event_id, payload)
