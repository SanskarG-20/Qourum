"""Bundled demo event formats and synthetic entry-fee estimates.

Formats map to the 12 historical event types so new ideas can use existing
member evidence without changing or exposing the synthetic latent personas.
Fees are illustrative planning assumptions, never real prices.
"""

from dataclasses import dataclass, replace
from typing import Iterable

from .models import EventType


@dataclass(frozen=True)
class EventFormat:
    id: str
    name: str
    base_type_name: str
    estimated_fee_inr: int
    modes: tuple[str, ...]
    duration_minutes: int | None = None
    category: str = "technical"
    skill_level: str = "beginner"
    min_capacity: int = 5
    max_capacity: int = 100


FORMATS = (
    EventFormat("workshop", "Hands-On Workshop", "Hands-On Workshop", 0, ("in_person", "online")),
    EventFormat("lightning-talk", "Technical Lightning Talk", "Technical Lightning Talk", 0, ("in_person", "online")),
    EventFormat("hackathon", "Hackathon & Build Jam", "Hackathon & Build Jam", 0, ("in_person", "online")),
    EventFormat("quiz", "Domain Quiz & Trivia", "Domain Quiz & Trivia", 0, ("in_person", "online")),
    EventFormat("social-mixer", "Social Mixer & Board Games", "Social Mixer & Board Games", 0, ("in_person", "online")),
    EventFormat("reading-group", "Reading Group & Paper Review", "Reading Group & Paper Review", 0, ("in_person", "online")),
    EventFormat("portfolio-clinic", "Portfolio & Resume Clinic", "Portfolio & Resume Clinic", 0, ("in_person", "online")),
    EventFormat("project-showcase", "Project Showcase & Demo Night", "Project Showcase & Demo Night", 0, ("in_person", "online")),
    EventFormat("industry-chat", "Industry Fireside Chat", "Industry Fireside Chat", 99, ("in_person", "online")),
    EventFormat("coworking-lab", "Open Coworking Lab", "Open Coworking Lab", 0, ("in_person", "online")),
    EventFormat("mentorship", "Peer Mentorship Circle", "Peer Mentorship Circle", 0, ("in_person", "online")),
    EventFormat("esports", "Esports & Casual Gaming", "Esports & Casual Gaming", 0, ("in_person", "online")),
    EventFormat("case-competition", "Case Competition", "Domain Quiz & Trivia", 99, ("in_person", "online"), 120),
    EventFormat("campus-quest", "Campus Quest / Hunter Quest", "Domain Quiz & Trivia", 0, ("in_person",), 120),
    EventFormat("ideathon", "Ideathon", "Hackathon & Build Jam", 0, ("in_person", "online"), 120),
    EventFormat("pitch-challenge", "Pitch Challenge", "Project Showcase & Demo Night", 99, ("in_person", "online"), 120),
)

_FORMAT_PROFILES = {
    "workshop": ("technical", "beginner", 10, 60),
    "lightning-talk": ("learning", "beginner", 8, 150),
    "hackathon": ("technical", "intermediate", 20, 120),
    "quiz": ("competitive", "beginner", 10, 100),
    "social-mixer": ("social", "beginner", 8, 50),
    "reading-group": ("learning", "intermediate", 5, 40),
    "portfolio-clinic": ("learning", "beginner", 6, 40),
    "project-showcase": ("technical", "intermediate", 10, 100),
    "industry-chat": ("learning", "beginner", 10, 100),
    "coworking-lab": ("social", "beginner", 5, 40),
    "mentorship": ("learning", "beginner", 5, 30),
    "esports": ("competitive", "beginner", 10, 80),
    "case-competition": ("competitive", "intermediate", 12, 80),
    "campus-quest": ("social", "beginner", 15, 100),
    "ideathon": ("technical", "beginner", 12, 80),
    "pitch-challenge": ("competitive", "intermediate", 10, 60),
}
FORMATS = tuple(
    replace(item, category=_FORMAT_PROFILES[item.id][0], skill_level=_FORMAT_PROFILES[item.id][1],
            min_capacity=_FORMAT_PROFILES[item.id][2], max_capacity=_FORMAT_PROFILES[item.id][3])
    for item in FORMATS
)

FORMAT_BY_ID = {item.id: item for item in FORMATS}


def is_online_venue(venue: str) -> bool:
    """Recognize the bundled demo's virtual venue names for mode filtering."""
    lowered = venue.casefold()
    return any(marker in lowered for marker in ("online", "virtual", "discord", "zoom"))


def available_formats(event_types: Iterable[EventType]) -> list[tuple[EventFormat, EventType]]:
    """Return bundled formats whose parent historical type exists locally."""
    by_name = {row.name: row for row in event_types}
    return [(item, by_name[item.base_type_name]) for item in FORMATS if item.base_type_name in by_name]
