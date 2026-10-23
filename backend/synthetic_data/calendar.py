"""
Academic Calendar definitions and helpers for Quorum's 18-month timeline.
Timeline spans 2024-10-01 to 2026-04-01 (~78 weeks).
"""

from dataclasses import dataclass
from datetime import date
from typing import List, Tuple


@dataclass(frozen=True)
class AcademicPeriod:
    name: str
    period_type: str  # 'exam_week', 'holiday', 'break', 'regular'
    start_date: date
    end_date: date
    description: str


# Fixed 18-month Collegiate Calendar
ACADEMIC_CALENDAR_PERIODS: List[AcademicPeriod] = [
    # Fall 2024
    AcademicPeriod(
        name="Fall 2024 Term",
        period_type="regular",
        start_date=date(2024, 10, 1),
        end_date=date(2024, 12, 6),
        description="Fall 2024 regular instruction period",
    ),
    AcademicPeriod(
        name="Fall 2024 Final Exams",
        period_type="exam_week",
        start_date=date(2024, 12, 7),
        end_date=date(2024, 12, 17),
        description="Fall semester final examination period",
    ),
    AcademicPeriod(
        name="Winter Break 2024-2025",
        period_type="break",
        start_date=date(2024, 12, 18),
        end_date=date(2025, 1, 12),
        description="Winter holiday recess",
    ),
    # Spring 2025
    AcademicPeriod(
        name="Spring 2025 Term",
        period_type="regular",
        start_date=date(2025, 1, 13),
        end_date=date(2025, 3, 2),
        description="Spring 2025 pre-midterm instruction",
    ),
    AcademicPeriod(
        name="Spring 2025 Midterm Exams",
        period_type="exam_week",
        start_date=date(2025, 3, 3),
        end_date=date(2025, 3, 9),
        description="Spring 2025 midterm evaluation week",
    ),
    AcademicPeriod(
        name="Spring Break 2025",
        period_type="holiday",
        start_date=date(2025, 3, 24),
        end_date=date(2025, 3, 30),
        description="Annual Spring recess",
    ),
    AcademicPeriod(
        name="Spring 2025 Final Exams",
        period_type="exam_week",
        start_date=date(2025, 5, 5),
        end_date=date(2025, 5, 16),
        description="Spring semester final examination period",
    ),
    # Summer 2025
    AcademicPeriod(
        name="Summer Break 2025",
        period_type="break",
        start_date=date(2025, 5, 17),
        end_date=date(2025, 8, 31),
        description="Summer vacation and research session",
    ),
    # Fall 2025
    AcademicPeriod(
        name="Fall 2025 Term",
        period_type="regular",
        start_date=date(2025, 9, 1),
        end_date=date(2025, 10, 26),
        description="Fall 2025 regular instruction",
    ),
    AcademicPeriod(
        name="Fall 2025 Midterm Exams",
        period_type="exam_week",
        start_date=date(2025, 10, 27),
        end_date=date(2025, 11, 2),
        description="Fall 2025 midterm examination week",
    ),
    AcademicPeriod(
        name="Thanksgiving Holiday 2025",
        period_type="holiday",
        start_date=date(2025, 11, 26),
        end_date=date(2025, 11, 30),
        description="Thanksgiving long weekend",
    ),
    AcademicPeriod(
        name="Fall 2025 Final Exams",
        period_type="exam_week",
        start_date=date(2025, 12, 8),
        end_date=date(2025, 12, 19),
        description="Fall 2025 final examination period",
    ),
    AcademicPeriod(
        name="Winter Break 2025-2026",
        period_type="break",
        start_date=date(2025, 12, 20),
        end_date=date(2026, 1, 11),
        description="Winter holiday break",
    ),
    # Spring 2026
    AcademicPeriod(
        name="Spring 2026 Term",
        period_type="regular",
        start_date=date(2026, 1, 12),
        end_date=date(2026, 3, 1),
        description="Spring 2026 instruction",
    ),
    AcademicPeriod(
        name="Spring 2026 Midterm Exams",
        period_type="exam_week",
        start_date=date(2026, 3, 2),
        end_date=date(2026, 3, 8),
        description="Spring 2026 midterm examination week",
    ),
    AcademicPeriod(
        name="Spring 2026 Post-Midterm Instruction",
        period_type="regular",
        start_date=date(2026, 3, 9),
        end_date=date(2026, 4, 1),
        description="End of synthetic simulation window",
    ),
]


def get_period_type_for_date(d: date) -> str:
    """Returns the period type for a specific date (exam_week, break, holiday, or regular)."""
    for period in ACADEMIC_CALENDAR_PERIODS:
        if period.start_date <= d <= period.end_date:
            if period.period_type in ("exam_week", "holiday", "break"):
                return period.period_type
    return "regular"


def is_exam_period(d: date) -> bool:
    """Returns True if the date falls inside a midterm or final exam week."""
    return get_period_type_for_date(d) == "exam_week"


def is_break_or_holiday(d: date) -> bool:
    """Returns True if the date falls inside a holiday recess or university break."""
    return get_period_type_for_date(d) in ("break", "holiday")
