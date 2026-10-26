"""Organizer-only recommendation endpoint with validated request controls."""

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session as OrmSession

from .dependencies import AuthContext, ClubAccess, get_db, require_club_organizer, require_csrf
from .event_catalog import available_formats
from .models import ClubMember, EventType
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
    format_ids: list[str] = Field(default_factory=list, max_length=16)
    fee_policy: Literal["any", "free", "paid"] = "any"
    max_fee_inr: int | None = Field(default=None, ge=0, le=100000)
    delivery_mode: Literal["any", "in_person", "online"] = "any"

    @field_validator("format_ids")
    @classmethod
    def unique_formats(cls, values: list[str]) -> list[str]:
        if len(values) != len(set(values)):
            raise ValueError("Select each event format only once.")
        return values

    @model_validator(mode="after")
    def compatible_fee_requirements(self):
        if self.fee_policy == "free" and self.max_fee_inr not in (None, 0):
            raise ValueError("Free-only events do not need a positive fee limit.")
        if self.fee_policy == "paid" and self.max_fee_inr == 0:
            raise ValueError("Paid events need a fee limit above zero.")
        return self


@router.get("/{club_id}/event-formats")
def club_event_formats(
    _organizer: ClubAccess = Depends(require_club_organizer),
    db: OrmSession = Depends(get_db),
) -> dict[str, object]:
    """Return the locally bundled formats and clearly marked demo fee estimates."""
    event_types = db.scalars(select(EventType)).all()
    return {
        "formats": [
            {"id": item.id, "name": item.name, "estimated_fee_inr": item.estimated_fee_inr,
             "delivery_modes": list(item.modes), "duration_minutes": item.duration_minutes or parent.default_duration_minutes}
            for item, parent in available_formats(event_types)
        ],
        "fees_are_synthetic_estimates": True,
    }


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
    available_ids = {item.id for item, _parent in available_formats(db.scalars(select(EventType)).all())}
    if any(format_id not in available_ids for format_id in payload.format_ids):
        raise HTTPException(status_code=422, detail="Select a supported event format.")
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
        format_ids=payload.format_ids,
        fee_policy=payload.fee_policy,
        max_fee_inr=payload.max_fee_inr,
        delivery_mode=payload.delivery_mode,
    )
    # Scoring only reads club data; the one write is the embedding cache, which must persist across requests.
    db.commit()
    return result
