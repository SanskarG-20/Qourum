"""Organizer-only recommendation endpoint with validated request controls."""

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from .dependencies import AuthContext, ClubAccess, get_db, require_club_organizer, require_csrf
from .models import ClubMember
from .recommendations import recommend_for_club

router = APIRouter(prefix="/api/clubs", tags=["recommendations"])


class RecommendationRequest(BaseModel):
    """Validated recommendation controls for one club planning run."""

    model_config = ConfigDict(extra="forbid")
    strategy: Literal["average", "least_misery", "most_pleasure", "multiplicative", "borda", "approval", "average_without_misery"] = "average"
    top_n: int = Field(default=10, ge=1, le=50)
    quorum: int | None = Field(default=None, ge=1, le=1000)
    horizon_days: int = Field(default=21, ge=1, le=90)
    fairness: bool = True
    diversity: bool = True
    start_date: date | None = None


@router.post("/{club_id}/recommendations")
def club_recommendations(
    club_id: str,
    payload: RecommendationRequest,
    _organizer: ClubAccess = Depends(require_club_organizer),
    _csrf: AuthContext = Depends(require_csrf),
    db: OrmSession = Depends(get_db),
) -> dict[str, object]:
    """Rank feasible event candidates for authenticated club organizers."""
    member_count = db.scalar(select(func.count(ClubMember.member_id)).where(ClubMember.club_id == club_id)) or 0
    if payload.quorum is not None and payload.quorum > member_count:
        raise HTTPException(status_code=422, detail="Quorum cannot exceed the club membership size.")
    result = recommend_for_club(
        db,
        club_id,
        strategy=payload.strategy,
        top_n=payload.top_n,
        quorum=payload.quorum,
        horizon_days=payload.horizon_days,
        fairness=payload.fairness,
        diversity=payload.diversity,
        anchor_date=payload.start_date,
    )
    # Scoring only reads club data; the one write is the embedding cache, which must persist across requests.
    db.commit()
    return result
