"""Parameterized SQLAlchemy repository queries for application data."""

from datetime import date, datetime

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from .models import (
    AcademicCalendar,
    Availability,
    Club,
    ClubMember,
    Event,
    EventType,
    Preference,
    RSVP,
    User,
)


def add_record(session: Session, record: object) -> object:
    """Add one mapped record to the caller-managed transaction."""
    session.add(record)
    return record


def get_user_by_email(session: Session, email: str) -> User | None:
    """Look up a user by an exact email value using a bound parameter."""
    return session.scalar(select(User).where(User.email == email.strip().lower()))


def get_club(session: Session, club_id: str) -> Club | None:
    """Fetch a club by primary key."""
    return session.get(Club, club_id)


def get_club_members(session: Session, club_id: str) -> list[tuple[User, str]]:
    """Return club members with their club-scoped roles in stable ID order."""
    query = (
        select(User, ClubMember.role)
        .join(ClubMember, ClubMember.member_id == User.id)
        .where(ClubMember.club_id == club_id)
        .order_by(User.id)
    )
    return list(session.execute(query).all())


def list_events(
    session: Session,
    club_id: str,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
) -> list[Event]:
    """List a club's events in an optional half-open start-time interval."""
    query: Select[tuple[Event]] = select(Event).where(Event.club_id == club_id)
    if start_at is not None:
        query = query.where(Event.start_time >= start_at)
    if end_at is not None:
        query = query.where(Event.start_time < end_at)
    return list(session.scalars(query.order_by(Event.start_time, Event.id)))


def get_event_types(session: Session) -> list[EventType]:
    """List the shared event-type catalog in stable ID order."""
    return list(session.scalars(select(EventType).order_by(EventType.id)))


def get_member_preferences(session: Session, member_id: str) -> list[Preference]:
    """List a member's event-type ratings in stable type order."""
    query = select(Preference).where(Preference.member_id == member_id).order_by(Preference.event_type_id)
    return list(session.scalars(query))


def get_member_availability(session: Session, member_id: str) -> list[Availability]:
    """List weekly windows and date overrides for one member."""
    query = (
        select(Availability)
        .where(Availability.member_id == member_id)
        .order_by(Availability.specific_date, Availability.day_of_week, Availability.start_time)
    )
    return list(session.scalars(query))


def get_calendar_periods(
    session: Session,
    on_date: date,
    club_id: str | None = None,
) -> list[AcademicCalendar]:
    """Return global and club-specific calendar periods containing a date."""
    query = select(AcademicCalendar).where(
        AcademicCalendar.start_date <= on_date,
        AcademicCalendar.end_date >= on_date,
    )
    if club_id is None:
        query = query.where(AcademicCalendar.club_id.is_(None))
    else:
        query = query.where((AcademicCalendar.club_id.is_(None)) | (AcademicCalendar.club_id == club_id))
    return list(session.scalars(query.order_by(AcademicCalendar.period_type, AcademicCalendar.name)))


def get_event_rsvps(session: Session, event_id: str) -> list[RSVP]:
    """List RSVP records for one event in stable member order."""
    query = select(RSVP).where(RSVP.event_id == event_id).order_by(RSVP.member_id)
    return list(session.scalars(query))
