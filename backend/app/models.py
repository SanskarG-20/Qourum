"""SQLAlchemy models for Quorum's local SQLite data store."""

from __future__ import annotations

from datetime import date, datetime, time, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Float,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    """Return the current UTC time as the naive datetime the database stores."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    """Base metadata for the complete application schema."""


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("length(trim(name)) > 0", name="ck_users_name_nonempty"),
        CheckConstraint("email = lower(email)", name="ck_users_email_lowercase"),
        CheckConstraint("instr(email, '@') > 1", name="ck_users_email_valid_shape"),
        Index("ix_users_email", "email", unique=True),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255))


class Club(Base):
    __tablename__ = "clubs"
    __table_args__ = (CheckConstraint("length(trim(name)) > 0", name="ck_clubs_name_nonempty"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")


class ClubMember(Base):
    __tablename__ = "club_members"
    __table_args__ = (
        CheckConstraint("role IN ('organizer', 'member')", name="ck_club_members_role"),
        Index("ix_club_members_member", "member_id"),
    )

    club_id: Mapped[str] = mapped_column(ForeignKey("clubs.id", ondelete="CASCADE"), primary_key=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False)


class EventType(Base):
    __tablename__ = "event_types"
    __table_args__ = (
        CheckConstraint("length(trim(name)) > 0", name="ck_event_types_name_nonempty"),
        CheckConstraint("default_duration_minutes > 0", name="ck_event_types_duration_positive"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    default_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (
        CheckConstraint("duration_minutes > 0", name="ck_events_duration_positive"),
        CheckConstraint("status IN ('proposed', 'scheduled', 'completed', 'cancelled')", name="ck_events_status"),
        Index("ix_events_club_start", "club_id", "start_time"),
        Index("ix_events_type_start", "event_type_id", "start_time"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    club_id: Mapped[str] = mapped_column(ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    event_type_id: Mapped[str] = mapped_column(ForeignKey("event_types.id", ondelete="RESTRICT"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    venue: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)


class EmbeddingCache(Base):
    """A normalized sentence vector keyed by content hash and immutable model revision."""

    __tablename__ = "embedding_cache"
    __table_args__ = (
        CheckConstraint("length(text_sha256) = 64 AND text_sha256 NOT GLOB '*[^0-9a-f]*'", name="ck_embedding_cache_hash"),
        CheckConstraint("dimension > 0", name="ck_embedding_cache_dimension"),
    )

    text_sha256: Mapped[str] = mapped_column(String(64), primary_key=True)
    model_revision: Mapped[str] = mapped_column(String(64), primary_key=True)
    vector: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    dimension: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)


class RSVP(Base):
    __tablename__ = "rsvps"
    __table_args__ = (
        UniqueConstraint("event_id", "member_id", name="uq_rsvps_event_member"),
        CheckConstraint("status IN ('yes', 'no', 'maybe')", name="ck_rsvps_status"),
        CheckConstraint("attended IN (0, 1)", name="ck_rsvps_attended_boolean"),
        CheckConstraint("rating IS NULL OR rating BETWEEN 1 AND 5", name="ck_rsvps_rating_range"),
        CheckConstraint("attended = 1 OR rating IS NULL", name="ck_rsvps_rating_requires_attendance"),
        Index("ix_rsvps_member_event", "member_id", "event_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    member_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(8), nullable=False)
    attended: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    rating: Mapped[int | None] = mapped_column(Integer)
    feedback: Mapped[str | None] = mapped_column(Text)


class Preference(Base):
    __tablename__ = "preferences"
    __table_args__ = (
        UniqueConstraint("member_id", "event_type_id", name="uq_preferences_member_event_type"),
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_preferences_rating_range"),
        Index("ix_preferences_event_type", "event_type_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_type_id: Mapped[str] = mapped_column(ForeignKey("event_types.id", ondelete="CASCADE"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)


class Availability(Base):
    __tablename__ = "availability"
    __table_args__ = (
        CheckConstraint("start_time < end_time", name="ck_availability_positive_window"),
        CheckConstraint(
            "(day_of_week IS NOT NULL AND specific_date IS NULL AND day_of_week BETWEEN 0 AND 6) "
            "OR (day_of_week IS NULL AND specific_date IS NOT NULL)",
            name="ck_availability_weekly_or_override",
        ),
        UniqueConstraint("member_id", "day_of_week", "start_time", "end_time", name="uq_availability_weekly_window"),
        UniqueConstraint("member_id", "specific_date", "start_time", "end_time", name="uq_availability_date_window"),
        Index("ix_availability_member_weekday", "member_id", "day_of_week"),
        Index("ix_availability_member_date", "member_id", "specific_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    day_of_week: Mapped[int | None] = mapped_column(Integer)
    specific_date: Mapped[date | None] = mapped_column(Date)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class MemberSettings(Base):
    """Member-level scheduling dealbreakers used by candidate generation."""

    __tablename__ = "member_settings"
    __table_args__ = (CheckConstraint("latest_start_time IS NULL OR latest_start_time BETWEEN '00:00:00' AND '23:59:59'", name="ck_member_settings_latest_start"),)

    member_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    latest_start_time: Mapped[time | None] = mapped_column(Time)


class AcademicCalendar(Base):
    __tablename__ = "academic_calendar"
    __table_args__ = (
        CheckConstraint("period_type IN ('exam_week', 'holiday', 'break', 'regular')", name="ck_academic_calendar_type"),
        CheckConstraint("start_date <= end_date", name="ck_academic_calendar_date_order"),
        Index("ix_academic_calendar_dates", "start_date", "end_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    club_id: Mapped[str | None] = mapped_column(ForeignKey("clubs.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    period_type: Mapped[str] = mapped_column(String(16), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")


class FairnessLedger(Base):
    __tablename__ = "fairness_ledger"
    __table_args__ = (
        ForeignKeyConstraint(
            ["club_id", "member_id"],
            ["club_members.club_id", "club_members.member_id"],
            ondelete="CASCADE",
            name="fk_fairness_member_in_club",
        ),
        UniqueConstraint("club_id", "member_id", name="uq_fairness_club_member"),
        CheckConstraint("satisfaction IS NULL OR satisfaction BETWEEN 0 AND 1", name="ck_fairness_satisfaction_range"),
        CheckConstraint("low_satisfaction_count >= 0", name="ck_fairness_count_nonnegative"),
        Index("ix_fairness_club_updated", "club_id", "updated_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    club_id: Mapped[str] = mapped_column(String(36), nullable=False)
    member_id: Mapped[str] = mapped_column(String(36), nullable=False)
    satisfaction: Mapped[float | None] = mapped_column(Float, nullable=True)
    low_satisfaction_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime)


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (Index("ix_sessions_user_expires", "user_id", "expires_at"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    csrf_token: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class LoginAttempt(Base):
    """Persist hashed login identifiers and rolling lockout state locally."""

    __tablename__ = "login_attempts"
    __table_args__ = (
        CheckConstraint("failures BETWEEN 0 AND 5", name="ck_login_attempts_failures"),
        Index("ix_login_attempts_lock", "locked_until"),
    )

    identifier_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    failures: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    window_started: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime)
