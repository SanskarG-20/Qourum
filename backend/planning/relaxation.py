"""Deterministic, I/O-free recovery for strict-empty club plans.

The ladder changes one setting family at a time. Calendar holidays, exam weeks,
format capacity, and existing-event conflicts always remain hard constraints.
"""

from __future__ import annotations

from datetime import date
from math import ceil
from typing import Any, Mapping

from . import config
from .candidates import assess_candidate, build_availability_index, generate_candidates
from .pipeline import build_plan


def feasible_count(settings: Mapping[str, Any]) -> int:
    """Count candidates passing the exact same hard filters as ``build_plan``."""
    members = settings["members"]
    candidates = generate_candidates(settings["formats"], settings["start_date"], settings["horizon_days"])
    calendar_flags = {day: list(flags) for day, flags in (settings.get("calendar_flags") or {}).items()}
    if settings.get("exclude_lab_heavy_days", False):
        for offset in range(settings["horizon_days"]):
            day = date.fromordinal(settings["start_date"].toordinal() + offset)
            if day.weekday() in config.LAB_HEAVY_WEEKDAYS and "lab_heavy_day" not in calendar_flags.get(day, ()):
                calendar_flags.setdefault(day, []).append("lab_heavy_day")
    availability_index = build_availability_index(members)
    schedule_cache: dict = {}
    eligibility_cache: dict = {}
    count = 0
    for candidate in candidates:
        assessment = assess_candidate(
            candidate, members, calendar_flags,
            min_people_available=settings["min_people_available"],
            availability_index=availability_index, schedule_cache=schedule_cache,
            eligibility_cache=eligibility_cache, include_member_details=False,
            selected_format_ids=settings.get("selected_format_ids"),
            excluded_format_ids=settings.get("excluded_format_ids"),
            only_date=settings.get("only_date"), only_time_block=settings.get("only_time_block"),
            fee_policy=settings.get("fee_policy", "any"), fee_cap_inr=settings.get("fee_cap_inr"),
            delivery_mode=settings.get("delivery_mode", "any"),
            existing_events=settings.get("existing_events", ()),
            skill_level_filter=settings.get("skill_level_filter", "any"),
            exclude_lab_heavy_days=settings.get("exclude_lab_heavy_days", False),
        )
        count += int(assessment.accepted)
    return count


def _widened_format_ids(settings: Mapping[str, Any]) -> list[str]:
    selected = list(settings.get("selected_format_ids") or [])
    if not selected:
        return selected
    categories = {item.category for item in settings["formats"] if item.format_id in selected}
    return sorted(set(selected) | {item.format_id for item in settings["formats"] if item.category in categories})


def _fee_thresholds(settings: Mapping[str, Any]) -> list[int]:
    cap = settings.get("fee_cap_inr")
    if cap is None:
        return []
    return sorted({item.fee_inr for item in settings["formats"] if item.fee_inr > cap})


def _diagnosis(strict: Mapping[str, Any], settings: Mapping[str, Any]) -> list[dict[str, Any]]:
    members = settings["members"]
    start = settings["start_date"]
    dates = [date.fromordinal(start.toordinal() + offset) for offset in range(settings["horizon_days"])]
    flags = settings.get("calendar_flags") or {}
    allowed_days = sum(not ({"holiday", "exam_week"} & set(flags.get(day, ()))) for day in dates)
    cap = settings.get("fee_cap_inr")
    selected = set(settings.get("selected_format_ids") or [item.format_id for item in settings["formats"]])
    excluded = set(settings.get("excluded_format_ids") or ())
    within_cap = sum(item.format_id in selected and item.format_id not in excluded
                     and (cap is None or item.fee_inr <= cap) for item in settings["formats"])
    detail = [
        {"code": "availability_profiles", "count": sum(any(window.is_available for window in member.availability) for member in members),
         "required": settings["min_people_available"], "label": "Members with available time set"},
        {"code": "exam_holiday_free_days", "count": allowed_days, "required": 1,
         "label": "Days outside holidays and exam weeks"},
        {"code": "formats_within_fee_cap", "count": within_cap, "required": 1,
         "label": "Allowed formats within the fee cap"},
    ]
    detail.extend({"code": group["reason_code"], "count": group["count"],
                   "label": group["label"] + " rejections"}
                  for group in strict.get("rejection_groups", ()) if group["count"] > 0)
    return detail


def _single_constraint_fixes(settings: Mapping[str, Any]) -> list[dict[str, Any]]:
    """Measure each possible one-setting change against the original strict plan."""
    options: list[tuple[str, str, dict[str, Any]]] = []
    horizon = settings["horizon_days"]
    if horizon < config.MAX_HORIZON_DAYS and settings.get("only_date") is None:
        options.append(("horizon", f"Look {config.MAX_HORIZON_DAYS} days ahead",
                        {"horizon_days": config.MAX_HORIZON_DAYS}))
    floor = max(config.RELAX_MIN_MEMBER_FLOOR, ceil(config.RELAX_MIN_MEMBER_FRACTION * len(settings["members"])))
    if settings["min_people_available"] > floor:
        options.append(("minimum_people", f"Need only {floor} people", {"min_people_available": floor}))
    for cap in _fee_thresholds(settings):
        candidate = {"fee_cap_inr": cap}
        if feasible_count({**settings, **candidate}) > 0:
            options.append(("fee_cap", f"Allow fees up to ₹{cap}", candidate))
            break
    if settings.get("delivery_mode", "any") != "any":
        options.append(("mode", "Allow online or in person", {"delivery_mode": "any"}))
    widened = _widened_format_ids(settings)
    if widened and set(widened) != set(settings.get("selected_format_ids") or ()):
        options.append(("formats", "Include related formats", {"selected_format_ids": widened}))
    if settings.get("only_date") is not None:
        options.append(("date", "Consider other days", {"only_date": None}))
    if settings.get("only_time_block") is not None:
        options.append(("time_block", "Consider other times", {"only_time_block": None}))
    if settings.get("fee_policy", "any") != "any":
        options.append(("fee_policy", "Consider free and paid", {"fee_policy": "any"}))
    if settings.get("skill_level_filter", "any") != "any":
        options.append(("skill", "Consider other experience levels", {"skill_level_filter": "any"}))
    if settings.get("exclude_lab_heavy_days", False):
        options.append(("lab_days", "Include lab-heavy days", {"exclude_lab_heavy_days": False}))
    if settings.get("excluded_format_ids"):
        options.append(("excluded_formats", "Allow excluded formats", {"excluded_format_ids": []}))
    fixes = [{"code": code, "label": label, "settings_updates": update,
              "idea_count": feasible_count({**settings, **update})} for code, label, update in options]
    return sorted((item for item in fixes if item["idea_count"] > 0),
                  key=lambda item: (-item["idea_count"], item["code"]))


def _annotate(result: dict, relaxations: list[dict[str, Any]], excluded_member_id: str | None) -> None:
    for item in result["recommendations"]:
        affected = [
            {"member_id": member_id, "reasons": member_result.get("unavailable_reasons", [])}
            for member_id, member_result in item["per_member_satisfaction"].items()
            if not member_result["available"]
        ]
        if excluded_member_id is not None:
            affected.append({"member_id": excluded_member_id, "reasons": ["excluded_from_plan"]})
        item["relaxations_applied"] = [dict(step) for step in relaxations]
        item["affected_members"] = sorted(affected, key=lambda entry: entry["member_id"])


def recover_plan(strict: dict, settings: Mapping[str, Any], *, excluded_member_id: str | None = None) -> dict:
    """Return exact, first attainable closest tier, or a counted diagnosis.

    Feasibility probes avoid fitting the scoring model. The first nonempty tier
    is always rebuilt with ``build_plan`` so displayed scores are genuine.
    """
    requested = {key: value for key, value in strict["settings"].items() if key != "effective_strategy"}
    strict_count = int(strict["feasible_count"])
    if strict_count:
        _annotate(strict, [], excluded_member_id)
        strict.update(tier="exact", strict_count=strict_count, results=strict["recommendations"],
                      diagnosis=[], fix_chips=[], requested_settings=requested)
        return strict

    current = dict(settings)
    current["calendar_flags"] = {day: list(flags) for day, flags in (settings.get("calendar_flags") or {}).items()}
    applied: list[dict[str, Any]] = []

    def attempt(code: str, key: str, value: Any) -> dict | None:
        old = current[key]
        if old == value:
            return None
        current[key] = value
        if code == "horizon" and current.get("exclude_lab_heavy_days"):
            for offset in range(old, value):
                day = date.fromordinal(current["start_date"].toordinal() + offset)
                if day.weekday() in config.LAB_HEAVY_WEEKDAYS:
                    current["calendar_flags"].setdefault(day, []).append("lab_heavy_day")
        step = {"code": code, "from": old.isoformat() if isinstance(old, date) else old,
                "to": value.isoformat() if isinstance(value, date) else value}
        existing = next((index for index, item in enumerate(applied) if item["code"] == code), None)
        if existing is None:
            applied.append(step)
        else:
            applied[existing]["to"] = step["to"]
        if feasible_count(current) == 0:
            return None
        return build_plan(**current)

    found = None
    if current.get("only_date") is None:
        while current["horizon_days"] < config.MAX_HORIZON_DAYS and found is None:
            found = attempt("horizon", "horizon_days", min(config.MAX_HORIZON_DAYS,
                            current["horizon_days"] + config.RELAX_HORIZON_STEP_DAYS))
    floor = max(config.RELAX_MIN_MEMBER_FLOOR, ceil(config.RELAX_MIN_MEMBER_FRACTION * len(current["members"])))
    while current["min_people_available"] > floor and found is None:
        found = attempt("minimum_people", "min_people_available", current["min_people_available"] - 1)
    if found is None:
        for cap in _fee_thresholds(current):
            found = attempt("fee_cap", "fee_cap_inr", cap)
            if found is not None:
                break
    if found is None and current.get("delivery_mode", "any") != "any":
        found = attempt("mode", "delivery_mode", "any")
    if found is None:
        widened = _widened_format_ids(current)
        if widened and set(widened) != set(current.get("selected_format_ids") or ()):
            found = attempt("formats", "selected_format_ids", widened)

    result = found if found is not None else strict
    _annotate(result, applied if found is not None else [], excluded_member_id)
    result.update(
        tier="closest" if found is not None else "none",
        strict_count=strict_count,
        results=result["recommendations"],
        requested_settings=requested,
        relaxations_applied=[dict(step) for step in applied] if found is not None else [],
        diagnosis=_diagnosis(strict, settings),
        fix_chips=_single_constraint_fixes(settings),
    )
    return result
