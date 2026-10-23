"""
Seeded Synthetic Data Generator for Quorum.
Simulates 18 months of college club history with:
- 3 clubs, 25-60 members each
- 12 event types
- Hidden latent member personas, time-slot fit, exam-week dips, repeat fatigue, and noise
- Cold-start (<3 events), sparse, and drifting members
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
import math
from typing import Dict, List, Tuple
import uuid
import numpy as np

from .calendar import ACADEMIC_CALENDAR_PERIODS, is_exam_period, is_break_or_holiday
from .models import (
    SyntheticClub,
    SyntheticMember,
    SyntheticEventType,
    SyntheticEvent,
    SyntheticRSVP,
    SyntheticPreference,
    SyntheticAvailability,
)


@dataclass
class GenerationConfig:
    seed: int = 42
    start_date: date = date(2024, 10, 1)
    end_date: date = date(2026, 4, 1)
    num_clubs: int = 3
    # Target sizes within [25, 60]
    club_sizes: Tuple[int, ...] = (42, 28, 54)


# Catalog of 12 distinct event types with 5D latent attribute vectors:
# [technical, social, competitive, career, foundational]
EVENT_TYPES_SPEC = [
    {
        "name": "Hands-On Workshop",
        "category": "Technical",
        "description": "Interactive technical lab building concrete tools or software.",
        "duration": 90,
        "latent": [0.95, 0.30, 0.20, 0.65, 0.80],
    },
    {
        "name": "Technical Lightning Talk",
        "category": "Seminar",
        "description": "Short tech deep-dives presented by student or faculty speakers.",
        "duration": 60,
        "latent": [0.85, 0.40, 0.15, 0.50, 0.90],
    },
    {
        "name": "Hackathon & Build Jam",
        "category": "Sprint",
        "description": "Collaborative project sprint with prizes and demos.",
        "duration": 180,
        "latent": [0.90, 0.70, 0.85, 0.60, 0.40],
    },
    {
        "name": "Domain Quiz & Trivia",
        "category": "Competition",
        "description": "Fast-paced quiz bowl on computer science and domain knowledge.",
        "duration": 60,
        "latent": [0.40, 0.60, 0.90, 0.20, 0.70],
    },
    {
        "name": "Social Mixer & Board Games",
        "category": "Community",
        "description": "Casual networking, board games, and food for club members.",
        "duration": 90,
        "latent": [0.10, 0.95, 0.35, 0.20, 0.10],
    },
    {
        "name": "Reading Group & Paper Review",
        "category": "Seminar",
        "description": "Discussion of recent research papers and theoretical foundations.",
        "duration": 60,
        "latent": [0.90, 0.30, 0.10, 0.40, 0.95],
    },
    {
        "name": "Portfolio & Resume Clinic",
        "category": "Career",
        "description": "Peer and alumni review of resumes, GitHub repos, and portfolios.",
        "duration": 75,
        "latent": [0.30, 0.50, 0.15, 0.95, 0.40],
    },
    {
        "name": "Project Showcase & Demo Night",
        "category": "Showcase",
        "description": "Formal end-of-term demonstration of student projects.",
        "duration": 120,
        "latent": [0.75, 0.80, 0.50, 0.75, 0.50],
    },
    {
        "name": "Industry Fireside Chat",
        "category": "Career",
        "description": "Q&A with visiting engineers, founders, and industry alumni.",
        "duration": 75,
        "latent": [0.50, 0.60, 0.10, 0.90, 0.60],
    },
    {
        "name": "Open Coworking Lab",
        "category": "Community",
        "description": "Informal drop-in study and hack session with snacks.",
        "duration": 120,
        "latent": [0.55, 0.70, 0.10, 0.30, 0.30],
    },
    {
        "name": "Peer Mentorship Circle",
        "category": "Mentorship",
        "description": "Structured upperclassmen guidance for incoming sophomores.",
        "duration": 60,
        "latent": [0.40, 0.80, 0.10, 0.70, 0.60],
    },
    {
        "name": "Esports & Casual Gaming",
        "category": "Community",
        "description": "LAN party and gaming tournament for club relaxation.",
        "duration": 120,
        "latent": [0.15, 0.90, 0.80, 0.10, 0.10],
    },
]

SLOT_DEFINITIONS = [
    {"slot_name": "morning", "start_time": time(9, 0), "end_time": time(11, 0)},
    {"slot_name": "midday", "start_time": time(12, 0), "end_time": time(14, 0)},
    {"slot_name": "afternoon", "start_time": time(15, 0), "end_time": time(17, 0)},
    {"slot_name": "evening", "start_time": time(18, 0), "end_time": time(20, 0)},
    {"slot_name": "late_evening", "start_time": time(20, 30), "end_time": time(22, 0)},
]

CLUB_METADATA = [
    {
        "name": "ACM & Robotics Guild",
        "description": "Hardware builders, systems programmers, and robotics sprint enthusiasts.",
        "persona_distribution": {"builder": 0.50, "researcher": 0.25, "career": 0.15, "social": 0.10},
    },
    {
        "name": "Design & Creative Commons",
        "description": "Digital designers, creative technologists, and UI/UX practitioners.",
        "persona_distribution": {"social": 0.45, "career": 0.30, "builder": 0.15, "casual": 0.10},
    },
    {
        "name": "Student AI & Data Society",
        "description": "Machine learning practitioners, algorithmic data scientists, and paper readers.",
        "persona_distribution": {"researcher": 0.45, "builder": 0.30, "career": 0.15, "social": 0.10},
    },
]

# Archetype latent profiles [technical, social, competitive, career, foundational]
PERSONA_ARCHETYPES = {
    "builder": [0.90, 0.40, 0.60, 0.50, 0.70],
    "researcher": [0.95, 0.25, 0.20, 0.45, 0.95],
    "social": [0.20, 0.95, 0.40, 0.30, 0.20],
    "career": [0.45, 0.60, 0.25, 0.95, 0.50],
    "casual": [0.40, 0.60, 0.40, 0.40, 0.40],
}


class SyntheticDatasetGenerator:
    """Generates synthetic dataset ensuring strict separation of latent variables."""

    def __init__(self, config: GenerationConfig = GenerationConfig()):
        self.config = config
        self.rng = np.random.RandomState(config.seed)
        self.clubs: List[SyntheticClub] = []
        self.event_types: List[SyntheticEventType] = []
        self.events: List[SyntheticEvent] = []
        self.rsvps: List[SyntheticRSVP] = []
        self.preferences: List[SyntheticPreference] = []
        self.availabilities: List[SyntheticAvailability] = []
        self.member_attended_count: Dict[str, int] = {}

    def _next_uuid(self) -> str:
        """Deterministic UUID generation from RNG state."""
        return str(uuid.UUID(bytes=self.rng.bytes(16)))

    def generate_all(self):
        """Executes the full seeded simulation pipeline."""
        self._generate_event_types()
        self._generate_clubs_and_members()
        self._generate_member_availabilities()
        self._generate_member_survey_preferences()
        self._simulate_historical_events_and_attendance()

    def _generate_event_types(self):
        """Generates the 12 standard event types."""
        for spec in EVENT_TYPES_SPEC:
            et = SyntheticEventType(
                id=self._next_uuid(),
                name=spec["name"],
                category=spec["category"],
                description=spec["description"],
                default_duration_minutes=spec["duration"],
                latent_attributes=spec["latent"],
            )
            self.event_types.append(et)

    def _generate_clubs_and_members(self):
        """Generates 3 clubs with 25-60 members each, including cold-start, sparse, and drifting."""
        for i, meta in enumerate(CLUB_METADATA):
            club_size = self.config.club_sizes[i]
            club_id = self._next_uuid()
            club = SyntheticClub(
                id=club_id,
                name=meta["name"],
                description=meta["description"],
                target_size=club_size,
            )

            # Generate members
            personas = list(meta["persona_distribution"].keys())
            probs = list(meta["persona_distribution"].values())

            for m_idx in range(club_size):
                m_id = self._next_uuid()
                role = "organizer" if m_idx < 2 else "member"

                # Sample persona archetype
                chosen_archetype = self.rng.choice(personas, p=probs)
                base_latent = np.array(PERSONA_ARCHETYPES[chosen_archetype], dtype=float)
                # Perturb slightly to avoid identical members
                member_latent = np.clip(base_latent + self.rng.normal(0, 0.08, size=5), 0.05, 1.0).tolist()

                # Determine activity tier:
                # 15% cold-start (<3 events), 25% sparse (3-6 events), 45% regular, 15% enthusiast
                tier_roll = self.rng.random_sample()
                if tier_roll < 0.15:
                    activity_tier = "cold_start"
                elif tier_roll < 0.40:
                    activity_tier = "sparse"
                elif tier_roll < 0.85:
                    activity_tier = "regular"
                else:
                    activity_tier = "enthusiast"

                # 20% of members experience interest drift over 18 months
                is_drifting = self.rng.random_sample() < 0.20
                drift_target = None
                if is_drifting:
                    # Pick an opposite or different archetype
                    drift_archetype = self.rng.choice(personas)
                    drift_target = np.clip(
                        np.array(PERSONA_ARCHETYPES[drift_archetype]) + self.rng.normal(0, 0.08, size=5),
                        0.05,
                        1.0,
                    ).tolist()

                # Generate slot preference weights
                slot_affinities = {
                    "morning": float(np.clip(self.rng.normal(0.40, 0.15), 0.1, 0.9)),
                    "midday": float(np.clip(self.rng.normal(0.55, 0.15), 0.2, 0.95)),
                    "afternoon": float(np.clip(self.rng.normal(0.65, 0.15), 0.2, 1.0)),
                    "evening": float(np.clip(self.rng.normal(0.85, 0.12), 0.3, 1.0)),
                    "late_evening": float(np.clip(self.rng.normal(0.50, 0.20), 0.1, 0.95)),
                }

                member = SyntheticMember(
                    id=m_id,
                    name=f"Member-{i+1:02d}-{m_idx+1:02d}",
                    email=f"member_{i+1}_{m_idx+1}@campus.edu",
                    club_id=club_id,
                    role=role,
                    activity_tier=activity_tier,
                    latent_persona=member_latent,
                    is_drifting=is_drifting,
                    drift_target=drift_target,
                    slot_affinities=slot_affinities,
                )
                club.members.append(member)

            self.clubs.append(club)

    def _generate_member_availabilities(self):
        """Generates weekly recurring availability windows plus exam/date overrides."""
        for club in self.clubs:
            for member in club.members:
                # Weekly recurring schedule: Monday to Sunday (0..6)
                for day_idx in range(7):
                    for slot in SLOT_DEFINITIONS:
                        # Baseline availability probability is linked to slot affinity
                        base_prob = member.slot_affinities.get(slot["slot_name"], 0.6)
                        # Weekend mornings are less popular; weekday evenings more popular
                        is_avail = bool(self.rng.random_sample() < (base_prob * 0.85))

                        self.availabilities.append(
                            SyntheticAvailability(
                                id=self._next_uuid(),
                                member_id=member.id,
                                day_of_week=day_idx,
                                slot_name=slot["slot_name"],
                                start_time=slot["start_time"],
                                end_time=slot["end_time"],
                                specific_date=None,
                                is_available=is_avail,
                            )
                        )

                # Add 2 to 4 specific date overrides (e.g. personal exams or travel)
                num_overrides = self.rng.randint(2, 5)
                for _ in range(num_overrides):
                    offset_days = self.rng.randint(0, (self.config.end_date - self.config.start_date).days)
                    override_date = self.config.start_date + timedelta(days=offset_days)
                    slot = self.rng.choice(SLOT_DEFINITIONS)
                    self.availabilities.append(
                        SyntheticAvailability(
                            id=self._next_uuid(),
                            member_id=member.id,
                            day_of_week=None,
                            slot_name=slot["slot_name"],
                            start_time=slot["start_time"],
                            end_time=slot["end_time"],
                            specific_date=override_date,
                            is_available=False,  # override to busy
                        )
                    )

    def _generate_member_survey_preferences(self):
        """Generates explicit 1-5 member ratings on event types from onboarding survey."""
        for club in self.clubs:
            for member in club.members:
                # Cold start members rated fewer items (1 to 3 items)
                # Regular members rated 8 to 12 items
                if member.activity_tier == "cold_start":
                    num_to_rate = self.rng.randint(1, 4)
                elif member.activity_tier == "sparse":
                    num_to_rate = self.rng.randint(3, 7)
                else:
                    num_to_rate = self.rng.randint(8, len(self.event_types) + 1)

                sampled_types = self.rng.choice(
                    self.event_types,
                    size=min(num_to_rate, len(self.event_types)),
                    replace=False,
                )

                for et in sampled_types:
                    # Dot product between initial latent persona and event attributes
                    content_score = np.dot(member.latent_persona, et.latent_attributes) / 2.5
                    # Scale to 1..5 integer rating with observation noise
                    noisy_rating = 1.0 + 4.0 * (content_score / (1.0 + content_score)) + self.rng.normal(0, 0.4)
                    rating_int = int(np.clip(round(noisy_rating), 1, 5))

                    self.preferences.append(
                        SyntheticPreference(
                            id=self._next_uuid(),
                            member_id=member.id,
                            event_type_id=et.id,
                            rating=rating_int,
                        )
                    )

    def _simulate_historical_events_and_attendance(self):
        """Simulates 18 months of event scheduling and attendance decisions."""
        current_date = self.config.start_date
        total_weeks = (self.config.end_date - self.config.start_date).days // 7
        venue_options = ["Engineering Hall 101", "Student Union 204", "Innovation Center Lab B", "Alumni Pavilion", "Discord / Online Lab"]

        # Track recent event types per club for repeat fatigue
        recent_club_events: Dict[str, List[Tuple[date, str]]] = {c.id: [] for c in self.clubs}

        week_idx = 0
        while current_date < self.config.end_date:
            # Advance weekly
            week_start = current_date
            week_end = current_date + timedelta(days=6)

            for club in self.clubs:
                # Event frequency: 1 event per week typically; during breaks/exam weeks, skip ~60% of events
                exam_week = is_exam_period(week_start)
                break_week = is_break_or_holiday(week_start)

                skip_prob = 0.65 if (exam_week or break_week) else 0.15
                if self.rng.random_sample() < skip_prob:
                    continue

                # Pick a day and time slot
                event_day_offset = self.rng.choice([1, 2, 3, 4, 5])  # Tue to Sat
                event_date = week_start + timedelta(days=int(event_day_offset))
                if event_date >= self.config.end_date:
                    break

                slot_spec = self.rng.choice(SLOT_DEFINITIONS)
                event_type = self.rng.choice(self.event_types)

                event_dt = datetime.combine(event_date, slot_spec["start_time"])
                event = SyntheticEvent(
                    id=self._next_uuid(),
                    club_id=club.id,
                    event_type_id=event_type.id,
                    title=f"{event_type.name} #{len(self.events) + 1}",
                    start_time=event_dt,
                    duration_minutes=event_type.default_duration_minutes,
                    venue=self.rng.choice(venue_options),
                    status="completed",
                    slot_name=slot_spec["slot_name"],
                    week_index=week_idx,
                )
                self.events.append(event)

                # Compute repeat-event fatigue factor for this club
                # Penalty if same event type held within last 21 days
                fatigue_factor = 1.0
                for past_date, past_type_id in recent_club_events[club.id]:
                    days_ago = (event_date - past_date).days
                    if past_type_id == event_type.id and days_ago < 21:
                        fatigue_factor *= 0.65 if days_ago < 10 else 0.80

                recent_club_events[club.id].append((event_date, event_type.id))

                # Simulate member RSVP and Attendance decisions
                self._simulate_attendance_for_event(
                    event=event,
                    event_type=event_type,
                    club=club,
                    week_idx=week_idx,
                    total_weeks=total_weeks,
                    fatigue_factor=fatigue_factor,
                    is_exam=exam_week,
                    is_break=break_week,
                )

            current_date += timedelta(days=7)
            week_idx += 1

    def _simulate_attendance_for_event(
        self,
        event: SyntheticEvent,
        event_type: SyntheticEventType,
        club: SyntheticClub,
        week_idx: int,
        total_weeks: int,
        fatigue_factor: float,
        is_exam: bool,
        is_break: bool,
    ):
        """Computes true attendance probabilities from hidden latent features and samples outcomes."""
        for member in club.members:
            # 1. Compute current latent persona vector (with temporal drift if applicable)
            if member.is_drifting and member.drift_target is not None:
                alpha = min(1.0, max(0.0, week_idx / float(total_weeks or 1)))
                current_latent = (1.0 - alpha) * np.array(member.latent_persona) + alpha * np.array(member.drift_target)
            else:
                current_latent = np.array(member.latent_persona)

            # 2. Content affinity: normalized dot product sigmoid
            dot = np.dot(current_latent, event_type.latent_attributes)
            content_affinity = 1.0 / (1.0 + math.exp(-2.2 * (dot - 1.2)))

            # 3. Slot affinity fit [0.2 .. 1.0]
            slot_fit = member.slot_affinities.get(event.slot_name, 0.6)

            # 4. Academic calendar modifier (exam-week dip)
            calendar_modifier = 0.25 if is_exam else (0.50 if is_break else 1.0)

            # Quality of fit for this member to this event [0 .. 1]
            fit_score = (content_affinity * 0.60 + slot_fit * 0.40)

            # Activity tier sets the overall baseline participation multiplier:
            current_attended = self.member_attended_count.get(member.id, 0)
            if member.activity_tier == "cold_start":
                # Cold start: strictly < 3 events attended over the entire 18 months
                if current_attended >= 2:
                    tier_prob = 0.0
                elif week_idx >= total_weeks - 12:
                    # Joined late in simulation window
                    tier_prob = 0.25
                else:
                    tier_prob = 0.01
            elif member.activity_tier == "sparse":
                # Sparse: occasional attendance (3 to 6 events over 18 months)
                if current_attended >= 6:
                    tier_prob = 0.01
                else:
                    tier_prob = 0.14
            elif member.activity_tier == "regular":
                tier_prob = 0.55
            else:  # enthusiast
                tier_prob = 0.82

            # Combined base probability of attendance
            base_prob = fit_score * tier_prob * calendar_modifier * fatigue_factor

            # Add small random ambient noise
            noise = self.rng.normal(0, 0.02)
            final_attend_prob = float(np.clip(base_prob + noise, 0.0, 0.95))

            # Sample RSVP status
            # RSVP 'yes' probability is correlated with attendance intention
            rsvp_prob = min(0.98, final_attend_prob * 1.15)
            if self.rng.random_sample() < rsvp_prob:
                rsvp_status = "yes"
            elif self.rng.random_sample() < 0.4:
                rsvp_status = "maybe"
            else:
                rsvp_status = "no"

            # Actual attendance outcome
            attended = bool(self.rng.random_sample() < final_attend_prob)
            if attended:
                self.member_attended_count[member.id] = self.member_attended_count.get(member.id, 0) + 1

            # Post-event rating (1-5) only if attended
            rating = None
            feedback = None
            if attended:
                noisy_rating = 1.0 + 4.0 * content_affinity + self.rng.normal(0, 0.35)
                rating = int(np.clip(round(noisy_rating), 1, 5))
                if rating >= 4:
                    feedback = "Great session, really relevant."
                elif rating <= 2:
                    feedback = "Not what I expected for my interests."

            self.rsvps.append(
                SyntheticRSVP(
                    id=self._next_uuid(),
                    event_id=event.id,
                    member_id=member.id,
                    rsvp_status=rsvp_status,
                    attended=attended,
                    rating=rating,
                    feedback=feedback,
                )
            )
