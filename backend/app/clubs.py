"""Club-scoped read endpoints with mandatory membership and role checks."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as OrmSession

from .dependencies import ClubAccess, get_db, require_club_member, require_club_organizer
from .models import Club
from .repositories import get_club_members, list_events

router = APIRouter(prefix="/api/clubs", tags=["clubs"])


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
            "start_time": event.start_time.isoformat(),
            "duration_minutes": event.duration_minutes,
            "venue": event.venue,
            "status": event.status,
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
