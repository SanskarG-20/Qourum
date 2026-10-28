"""Strict-empty recovery, hard constraints, one-change fixes, and sweep coverage."""

from dataclasses import replace
from datetime import date

from backend.evaluation.plan_reliability import (
    CLUB_SIZES, CONFLICT_LEVELS, SETTING_CASES, SWEEP_START, reliability_sweep, sweep_settings,
)
from backend.planning.pipeline import build_plan
from backend.planning.relaxation import recover_plan


def _recover(settings):
    strict = build_plan(**settings)
    return strict, recover_plan(strict, settings)


def test_relaxation_order_fee_threshold_and_hard_calendar_rules():
    settings = sweep_settings(5, 0.0, "fee_limited", 42)
    strict, result = _recover(settings)
    assert strict["feasible_count"] == 0
    assert result["tier"] == "closest"
    assert [step["code"] for step in result["relaxations_applied"]] == ["horizon", "fee_cap"]
    assert result["relaxations_applied"][-1]["to"] == 100
    assert result["strict_count"] == 0
    assert result["recommendations"]
    assert all(item["event_date"] not in {SWEEP_START.isoformat(), date.fromordinal(SWEEP_START.toordinal() + 1).isoformat()}
               for item in result["recommendations"])
    assert all(item["relaxations_applied"] == result["relaxations_applied"] for item in result["recommendations"])


def test_capacity_is_never_relaxed_but_related_format_can_be_added():
    settings = sweep_settings(5, 0.0, "open", 42)
    blocked = replace(settings["formats"][0], max_capacity=1, min_capacity=1)
    settings["formats"] = [blocked, *settings["formats"][1:]]
    settings["selected_format_ids"] = [blocked.format_id]
    strict, result = _recover(settings)
    assert strict["feasible_count"] == 0
    assert result["tier"] == "closest"
    assert result["relaxations_applied"][-1]["code"] == "formats"
    assert all(item["format_id"] != blocked.format_id for item in result["recommendations"])
    assert any("format_capacity_exceeded" in item["reason_codes"]
               for item in result["rejected_candidates"] if item["format_id"] == blocked.format_id)


def test_all_exam_dates_return_specific_nonempty_diagnosis():
    settings = sweep_settings(5, 0.5, "open", 42)
    settings["calendar_flags"] = {
        date.fromordinal(SWEEP_START.toordinal() + offset): ["exam_week"] for offset in range(60)
    }
    strict, result = _recover(settings)
    assert strict["feasible_count"] == 0
    assert result["tier"] == "none"
    assert result["recommendations"] == []
    assert any(item["code"] == "exam_holiday_free_days" and item["count"] == 0 for item in result["diagnosis"])
    assert any(item["code"] == "exam_week" and item["count"] > 0 for item in result["diagnosis"])
    assert not any(step["code"] in {"exam_week", "holiday", "capacity"} for step in result["relaxations_applied"])


def test_each_fix_chip_count_equals_its_actual_single_change_rerun():
    settings = sweep_settings(5, 0.0, "fee_limited", 42)
    _, result = _recover(settings)
    assert result["fix_chips"]
    assert result["fix_chips"] == sorted(result["fix_chips"], key=lambda chip: (-chip["idea_count"], chip["code"]))
    for chip in result["fix_chips"]:
        rerun = build_plan(**{**settings, **chip["settings_updates"]})
        assert chip["idea_count"] == rerun["feasible_count"]


def test_fourteen_member_strict_empty_returns_closest_matches():
    settings = sweep_settings(14, 0.0, "open", 42)
    settings["members"] = [replace(member, availability=()) if index >= 8 else member
                           for index, member in enumerate(settings["members"])]
    settings["min_people_available"] = 14
    strict, result = _recover(settings)
    assert strict["feasible_count"] == 0
    assert result["tier"] == "closest"
    assert result["recommendations"]
    assert any(step["code"] == "minimum_people" for step in result["relaxations_applied"])
    assert result["recommendations"][0]["affected_members"]


def test_combinatorial_sweep_has_results_or_counted_reason_for_every_case():
    report = reliability_sweep(42)
    assert report["total"] == len(CLUB_SIZES) * len(CONFLICT_LEVELS) * len(SETTING_CASES)
    assert len(report["cases"]) == report["total"]
    assert all(row["returned_count"] > 0 or row["diagnosis_count"] > 0 for row in report["cases"])
    assert sum(report["counts"].values()) == report["total"]
    assert {row["club_size"] for row in report["cases"]} == set(CLUB_SIZES)
    assert {row["conflict_level"] for row in report["cases"]} == set(CONFLICT_LEVELS)
