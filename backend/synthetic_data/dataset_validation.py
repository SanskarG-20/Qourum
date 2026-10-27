"""Validation for the normalized synthetic and imported research tables."""

from __future__ import annotations

import pandas as pd

TABLE_COLUMNS = {
    "clubs": ("club_id", "name", "conflict_level"),
    "members": ("member_id", "club_id", "year", "branch", "role", "join_month", "max_fee", "mode_pref", "commute_type", "engagement_level"),
    "formats": ("format_id", "name", "category", "duration_hrs", "typical_fee", "team_based", "skill_level", "prep_days", "min_capacity", "max_capacity"),
    "calendar": ("date", "exam_week", "holiday", "fest_week", "lab_heavy_day"),
    "availability": ("member_id", "day_of_week", "time_block", "status"),
    "events": ("event_id", "club_id", "format_id", "date", "time_block", "mode", "fee", "capacity", "registrations", "attended_count"),
    "attendance": ("event_id", "member_id", "registered", "attended", "rating"),
}
PRIMARY_KEYS = {
    "clubs": ("club_id",), "members": ("member_id",), "formats": ("format_id",),
    "calendar": ("date",), "availability": ("member_id", "day_of_week", "time_block"),
    "events": ("event_id",), "attendance": ("event_id", "member_id"),
}
BLOCKS = {"morning", "midday", "afternoon", "evening", "late_evening"}
_BOOL = {True, False, "True", "False", "true", "false", 1, 0, "1", "0"}


def validate_research_tables(tables: dict[str, pd.DataFrame]) -> None:
    """Raise ValueError with table/row context for schema, enum, range, or FK violations."""
    missing = set(TABLE_COLUMNS) - set(tables)
    if missing:
        raise ValueError(f"Missing tables: {', '.join(sorted(missing))}")
    for table, columns in TABLE_COLUMNS.items():
        frame = tables[table]
        absent = set(columns) - set(frame.columns)
        if absent:
            raise ValueError(f"{table} missing columns: {', '.join(sorted(absent))}")
        if frame[list(columns)].isna().any().any():
            # Null ratings are the one explicitly nullable field.
            null_columns = [c for c in columns if frame[c].isna().any() and not (table == "attendance" and c == "rating")]
            if null_columns:
                raise ValueError(f"{table} has null required values in: {', '.join(null_columns)}")
        key = list(PRIMARY_KEYS[table])
        if frame.duplicated(key).any():
            raise ValueError(f"{table} has duplicate key {key}")

    clubs, members, formats = tables["clubs"], tables["members"], tables["formats"]
    calendar, availability, events, attendance = (tables[k] for k in ("calendar", "availability", "events", "attendance"))
    def require(condition: bool, message: str) -> None:
        if not condition:
            raise ValueError(message)

    require(clubs["conflict_level"].between(0, 1).all(), "clubs.conflict_level must be in [0, 1]")
    require(members["club_id"].isin(set(clubs.club_id)).all(), "members.club_id contains an unknown club")
    require(members["year"].between(1, 4).all(), "members.year must be in [1, 4]")
    require(members["role"].isin({"core", "regular"}).all(), "members.role must be core or regular")
    require(members["mode_pref"].isin({"in_person", "online", "either"}).all(), "members.mode_pref is invalid")
    require(members["max_fee"].ge(0).all(), "members.max_fee must be nonnegative")
    require(members["engagement_level"].isin({"low", "medium", "high"}).all(), "members.engagement_level is invalid")
    require(members["commute_type"].isin({"walk", "transit", "cycle", "residential"}).all(), "members.commute_type is invalid")
    require(members["join_month"].astype(str).str.fullmatch(r"\d{4}-(0[1-9]|1[0-2])").all(), "members.join_month must use YYYY-MM")
    require(formats["category"].isin({"technical", "social", "competitive", "learning"}).all(), "formats.category is invalid")
    require(formats["duration_hrs"].gt(0).all(), "formats.duration_hrs must be positive")
    require(formats["typical_fee"].ge(0).all(), "formats.typical_fee must be nonnegative")
    require(formats["skill_level"].isin({"beginner", "intermediate", "advanced"}).all(), "formats.skill_level is invalid")
    require(formats["prep_days"].ge(0).all(), "formats.prep_days must be nonnegative")
    require(formats["min_capacity"].ge(1).all() and (formats["min_capacity"] <= formats["max_capacity"]).all(), "formats capacity bounds are invalid")
    for table, column in (("calendar", "exam_week"), ("calendar", "holiday"), ("calendar", "fest_week"), ("calendar", "lab_heavy_day"), ("formats", "team_based"), ("attendance", "registered"), ("attendance", "attended")):
        require(tables[table][column].isin(_BOOL).all(), f"{table}.{column} must be boolean")
    require(availability["member_id"].isin(set(members.member_id)).all(), "availability.member_id contains an unknown member")
    require(availability["day_of_week"].between(0, 6).all(), "availability.day_of_week must be in [0, 6]")
    require(availability["time_block"].isin(BLOCKS).all(), "availability.time_block is invalid")
    require(availability["status"].isin({"free", "maybe", "busy"}).all(), "availability.status is invalid")
    require(events["club_id"].isin(set(clubs.club_id)).all(), "events.club_id contains an unknown club")
    require(events["format_id"].isin(set(formats.format_id)).all(), "events.format_id contains an unknown format")
    require(events["date"].isin(set(calendar.date)).all(), "events.date is missing from calendar")
    require(events["time_block"].isin(BLOCKS).all(), "events.time_block is invalid")
    require(events["mode"].isin({"in_person", "online"}).all(), "events.mode is invalid")
    require(events["fee"].ge(0).all(), "events.fee must be nonnegative")
    require(events["capacity"].ge(1).all(), "events.capacity must be positive")
    require(events["registrations"].between(0, events["capacity"]).all(), "events.registrations must be between zero and capacity")
    require(events["attended_count"].between(0, events["registrations"]).all(), "events.attended_count must be between zero and registrations")
    require(attendance["event_id"].isin(set(events.event_id)).all(), "attendance.event_id contains an unknown event")
    require(attendance["member_id"].isin(set(members.member_id)).all(), "attendance.member_id contains an unknown member")
    event_clubs = events.set_index("event_id")["club_id"]
    member_clubs = members.set_index("member_id")["club_id"]
    require(all(event_clubs[row.event_id] == member_clubs[row.member_id] for row in attendance.itertuples()), "attendance member and event must belong to the same club")
    require(not ((attendance.attended == True) & (attendance.registered != True)).any(), "attended records must be registered")
    rated = attendance.rating.dropna()
    require(rated.between(1, 5).all(), "attendance.rating must be null or in [1, 5]")
    counts = attendance.groupby("event_id").agg(registrations=("registered", "sum"), attended_count=("attended", "sum"))
    event_counts = events.set_index("event_id")[["registrations", "attended_count"]]
    require(counts["registrations"].reindex(event_counts.index, fill_value=0).equals(event_counts["registrations"].astype("int64")), "events.registrations must match attendance records")
    require(counts["attended_count"].reindex(event_counts.index, fill_value=0).equals(event_counts["attended_count"].astype("int64")), "events.attended_count must match attendance records")\n