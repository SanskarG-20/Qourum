"""
Data models for the synthetic generator.
Contains internal generation classes (with hidden latent traits)
and clean export dataclasses (strictly containing only observable features).
"""

from dataclasses import dataclass, field
from datetime import date, time, datetime
from typing import Dict, List, Optional
import uuid


@dataclass
class SyntheticEventType:
    id: str
    name: str
    category: str
    description: str
    default_duration_minutes: int
    # Hidden latent representation (e.g. 5D: [technical, social, competitive, career, foundational])
    latent_attributes: List[float]


@dataclass
class SyntheticMember:
    id: str
    name: str
    email: str
    club_id: str
    role: str  # 'organizer' or 'member'
    # Hidden latent features (NEVER EXPORTED)
    activity_tier: str  # 'cold_start', 'sparse', 'regular', 'enthusiast'
    latent_persona: List[float]
    is_drifting: bool = False
    drift_target: Optional[List[float]] = None
    # Slot fit preferences: slot_name -> affinity multiplier [0.2 .. 1.0]
    slot_affinities: Dict[str, float] = field(default_factory=dict)


@dataclass
class SyntheticClub:
    id: str
    name: str
    description: str
    target_size: int
    members: List[SyntheticMember] = field(default_factory=list)


@dataclass
class SyntheticEvent:
    id: str
    club_id: str
    event_type_id: str
    title: str
    description: str
    start_time: datetime
    duration_minutes: int
    venue: str
    status: str
    slot_name: str
    week_index: int


@dataclass
class SyntheticRSVP:
    id: str
    event_id: str
    member_id: str
    rsvp_status: str  # 'yes', 'no', 'maybe'
    attended: bool
    rating: Optional[int]
    feedback: Optional[str] = None


@dataclass
class SyntheticPreference:
    id: str
    member_id: str
    event_type_id: str
    rating: int


@dataclass
class SyntheticAvailability:
    id: str
    member_id: str
    day_of_week: Optional[int]
    slot_name: str
    start_time: time
    end_time: time
    specific_date: Optional[date]
    is_available: bool
