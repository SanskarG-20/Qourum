"""Checks for reproducible, chronological planning evaluation artifacts."""

from pathlib import Path

from backend.evaluation.planning_report import CONFLICT_LEVELS, _read_real_csv, evaluate_tables, generate_report, temporal_split
from backend.synthetic_data.csv_merge import write_csv_tables
from backend.synthetic_data.research_dataset import ResearchDatasetGenerator, ResearchGenerationConfig


def _tables():
    return ResearchDatasetGenerator(ResearchGenerationConfig(
        seed=42, num_clubs=5, history_months=12, min_members=25, max_members=25,
        club_conflict_levels=CONFLICT_LEVELS,
    )).generate()


def test_temporal_split_has_no_future_training_event():
    train, test = temporal_split(_tables()["events"])
    for club_id in train.club_id.unique():
        assert train.loc[train.club_id == club_id, "date"].max() < test.loc[test.club_id == club_id, "date"].min()


def test_held_out_attendance_cannot_change_predictions():
    tables = _tables()
    original = evaluate_tables(tables, 42, "synthetic")
    _, test = temporal_split(tables["events"])
    event_id = test.iloc[0].event_id
    rows = tables["attendance"]
    first = rows.index[(rows.event_id == event_id) & rows.attended][0]
    rows.at[first, "attended"] = False
    rows.at[first, "rating"] = None
    tables["events"].loc[tables["events"].event_id == event_id, "attended_count"] -= 1
    changed = evaluate_tables(tables, 42, "synthetic")
    assert [r["predicted_attendance"] for r in original["predictions"]] == [r["predicted_attendance"] for r in changed["predictions"]]
    assert [r["actual_attendance"] for r in original["predictions"]] != [r["actual_attendance"] for r in changed["predictions"]]


def test_regeneration_is_byte_reproducible_and_real_is_unavailable(tmp_path: Path):
    first = generate_report(42, tmp_path / "tables-a", tmp_path / "page-a")
    second = generate_report(42, tmp_path / "tables-b", tmp_path / "page-b")
    assert first == second
    assert first["real"]["status"] == "unavailable"
    for folder in ("tables", "page"):
        a = tmp_path / f"{folder}-a"
        b = tmp_path / f"{folder}-b"
        assert {p.name: p.read_bytes() for p in a.iterdir()} == {p.name: p.read_bytes() for p in b.iterdir()}


def test_supplied_csv_tables_are_loaded_as_a_separate_source(tmp_path: Path):
    # The fixture is synthetic; this checks the real-data import path only.
    write_csv_tables(_tables(), tmp_path)
    imported = _read_real_csv(tmp_path)
    assert set(imported) == {"clubs", "members", "formats", "calendar", "availability", "events", "attendance"}
    assert evaluate_tables(imported, 42, "real")["source"] == "real"
