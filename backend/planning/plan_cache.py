"""Bounded in-memory cache for deterministic plan results."""

from __future__ import annotations

from collections import OrderedDict
from copy import deepcopy
from dataclasses import asdict, is_dataclass
from datetime import date, datetime, time
from hashlib import sha256
import json
from threading import RLock
from typing import Callable, Mapping, Sequence

from .models import PlanFormat, PlanMember, PlanObservation


def settings_hash(
    *,
    club_id: str,
    settings: Mapping[str, object],
    members: Sequence[PlanMember],
    formats: Sequence[PlanFormat],
    observations: Sequence[PlanObservation],
    explicit_preferences: Mapping[tuple[str, str], float],
    calendar_flags: Mapping[date, Sequence[str]],
    existing_events: Sequence[tuple[datetime, datetime]],
) -> str:
    """Hash settings and every planner input so changed club data cannot reuse stale results."""

    def encode(value):
        if isinstance(value, (date, datetime, time)):
            return value.isoformat()
        if is_dataclass(value):
            return asdict(value)
        raise TypeError(f"Cannot encode {type(value).__name__} in a plan cache key")

    member_rows = []
    for member in sorted(members, key=lambda item: item.member_id):
        member_row = asdict(member)
        member_row["availability"] = sorted(
            member_row["availability"],
            key=lambda item: json.dumps(item, sort_keys=True, default=encode),
        )
        member_rows.append(member_row)
    observation_rows = [asdict(item) for item in observations]
    observation_rows.sort(key=lambda item: json.dumps(item, sort_keys=True, default=encode))
    payload = {
        "club_id": club_id,
        "settings": settings,
        "members": member_rows,
        "formats": [asdict(item) for item in sorted(formats, key=lambda item: item.format_id)],
        "observations": observation_rows,
        "explicit_preferences": sorted(
            (member_id, format_id, value)
            for (member_id, format_id), value in explicit_preferences.items()
        ),
        "calendar_flags": sorted(
            (day.isoformat(), sorted(flags)) for day, flags in calendar_flags.items()
        ),
        "existing_events": sorted(
            (start.isoformat(), end.isoformat()) for start, end in existing_events
        ),
    }

    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=encode)
    return sha256(canonical.encode("utf-8")).hexdigest()


class PlanResultCache:
    """Thread-safe least-recently-used cache with a fixed maximum entry count."""

    def __init__(self, max_entries: int):
        if max_entries < 1:
            raise ValueError("max_entries must be positive")
        self._max_entries = max_entries
        self._items: OrderedDict[str, dict[str, object]] = OrderedDict()
        self._lock = RLock()

    def get_or_build(self, key: str, builder: Callable[[], dict[str, object]]):
        """Return a deep copy and whether the value was already cached."""
        with self._lock:
            if key in self._items:
                self._items.move_to_end(key)
                return deepcopy(self._items[key]), True
            result = builder()
            self._items[key] = deepcopy(result)
            while len(self._items) > self._max_entries:
                self._items.popitem(last=False)
            return deepcopy(result), False

    def clear(self) -> None:
        """Clear cached plan responses."""
        with self._lock:
            self._items.clear()
