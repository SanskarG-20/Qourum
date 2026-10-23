"""
Exporter for synthetic datasets.
Produces clean DataFrames for local simulation and evaluation.

HARD RULE ENFORCEMENT:
All latent member personas, attribute vectors, activity tiers, and drift indicators
are strictly scrubbed and never included in exported tables or features.
"""

from typing import Dict
import pandas as pd

from .calendar import ACADEMIC_CALENDAR_PERIODS
from .generator import SyntheticDatasetGenerator

# Disallowed latent substrings or column names
PROHIBITED_LATENT_SUBSTRINGS = [
    "latent",
    "persona",
    "drift",
    "activity_tier",
    "tier_scaling",
    "content_affinity",
    "fatigue_factor",
    "slot_affinities",
]


def _validate_clean_columns(df: pd.DataFrame, table_name: str):
    """Hard check ensuring no latent or ground-truth generation parameters leak."""
    for col in df.columns:
        col_lower = str(col).lower()
        for banned in PROHIBITED_LATENT_SUBSTRINGS:
            if banned in col_lower:
                raise ValueError(
                    f"CRITICAL PRIVACY VIOLATION: Latent feature '{col}' leaked into public table '{table_name}'!"
                )


def export_feature_datasets(generator: SyntheticDatasetGenerator) -> Dict[str, pd.DataFrame]:
    """
    Exports clean pandas DataFrames strictly containing observable fields.
    Validates that no latent columns are present in any exported dataset.
    """
    # 1. Clubs
    clubs_df = pd.DataFrame([
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
        }
        for c in generator.clubs
    ])
    _validate_clean_columns(clubs_df, "clubs")

    # 2. Members (Latent persona, activity tier, drift target strictly omitted)
    members_list = []
    club_members_list = []
    for c in generator.clubs:
        for m in c.members:
            members_list.append({
                "id": m.id,
                "name": m.name,
                "email": m.email,
            })
            club_members_list.append({
                "club_id": c.id,
                "member_id": m.id,
                "role": m.role,
            })
    members_df = pd.DataFrame(members_list)
    club_members_df = pd.DataFrame(club_members_list)
    _validate_clean_columns(members_df, "members")
    _validate_clean_columns(club_members_df, "club_members")

    # 3. Event Types (Latent attributes strictly omitted)
    event_types_df = pd.DataFrame([
        {
            "id": et.id,
            "name": et.name,
            "category": et.category,
            "description": et.description,
            "default_duration_minutes": et.default_duration_minutes,
        }
        for et in generator.event_types
    ])
    _validate_clean_columns(event_types_df, "event_types")

    # 4. Events
    events_df = pd.DataFrame([
        {
            "id": e.id,
            "club_id": e.club_id,
            "event_type_id": e.event_type_id,
            "title": e.title,
            "description": e.description,
            "start_time": e.start_time.isoformat(),
            "duration_minutes": e.duration_minutes,
            "venue": e.venue,
            "status": e.status,
            "slot_name": e.slot_name,
        }
        for e in generator.events
    ])
    _validate_clean_columns(events_df, "events")

    # 5. RSVPs / Attendance
    rsvps_df = pd.DataFrame([
        {
            "id": r.id,
            "event_id": r.event_id,
            "member_id": r.member_id,
            "rsvp_status": r.rsvp_status,
            "attended": r.attended,
            "rating": r.rating,
            "feedback": r.feedback,
        }
        for r in generator.rsvps
    ])
    _validate_clean_columns(rsvps_df, "rsvps")

    # 6. Preferences
    preferences_df = pd.DataFrame([
        {
            "id": p.id,
            "member_id": p.member_id,
            "event_type_id": p.event_type_id,
            "rating": p.rating,
        }
        for p in generator.preferences
    ])
    _validate_clean_columns(preferences_df, "preferences")

    # 7. Availability
    availability_df = pd.DataFrame([
        {
            "id": a.id,
            "member_id": a.member_id,
            "day_of_week": a.day_of_week,
            "slot_name": a.slot_name,
            "start_time": a.start_time.strftime("%H:%M:%S"),
            "end_time": a.end_time.strftime("%H:%M:%S"),
            "specific_date": a.specific_date.isoformat() if a.specific_date else None,
            "is_available": a.is_available,
        }
        for a in generator.availabilities
    ])
    _validate_clean_columns(availability_df, "availability")

    # 8. Academic Calendar
    calendar_df = pd.DataFrame([
        {
            "name": period.name,
            "period_type": period.period_type,
            "start_date": period.start_date.isoformat(),
            "end_date": period.end_date.isoformat(),
            "description": period.description,
        }
        for period in ACADEMIC_CALENDAR_PERIODS
    ])
    _validate_clean_columns(calendar_df, "academic_calendar")

    return {
        "clubs": clubs_df,
        "members": members_df,
        "club_members": club_members_df,
        "event_types": event_types_df,
        "events": events_df,
        "rsvps": rsvps_df,
        "preferences": preferences_df,
        "availability": availability_df,
        "academic_calendar": calendar_df,
    }
