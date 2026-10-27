"""Acceptance coverage for the research dataset, validation, and CSV overlay."""

from pathlib import Path

import pandas as pd
import pytest

from backend.synthetic_data.csv_merge import merge_csv_directory, write_csv_tables
from backend.synthetic_data.dataset_validation import validate_research_tables
from backend.synthetic_data.research_dataset import ResearchDatasetGenerator, ResearchGenerationConfig
from backend.synthetic_data.cli import generate_and_report


SAMPLE_CSV = Path(__file__).parents[1] / "synthetic_data" / "sample_csv"


def test_research_dataset_dimensions_and_validator():
    tables = ResearchDatasetGenerator(ResearchGenerationConfig(seed=42)).generate()
    validate_research_tables(tables)
    assert len(tables["clubs"]) in (5, 6)
    assert tables["members"].groupby("club_id").size().between(25, 60).all()
    assert len(tables["formats"]) == 16
    assert tables["calendar"]["date"].min() < tables["calendar"]["date"].max()
    assert set(tables["availability"].time_block) == {"morning", "midday", "afternoon", "evening", "late_evening"}
    assert {"persona", "fee_sensitivity", "exam_dropout"}.isdisjoint(tables["members"].columns)


def test_same_seed_produces_identical_tables():
    left = ResearchDatasetGenerator(ResearchGenerationConfig(seed=197)).generate()
    right = ResearchDatasetGenerator(ResearchGenerationConfig(seed=197)).generate()
    for name in left:
        pd.testing.assert_frame_equal(left[name], right[name])


def test_different_seed_changes_generated_data():
    left = ResearchDatasetGenerator(ResearchGenerationConfig(seed=197)).generate()
    right = ResearchDatasetGenerator(ResearchGenerationConfig(seed=198)).generate()
    assert not left["members"].equals(right["members"])


def test_club_conflict_level_controls_persona_mixing():
    tables = ResearchDatasetGenerator(ResearchGenerationConfig(
        seed=42, club_conflict_levels=(0.0, 1.0, 0.25, 0.5, 0.75)
    )).generate()
    members = tables["members"].merge(tables["clubs"], on="club_id")
    homogeneous = members[members["conflict_level"] == 0.0]
    divergent = members[members["conflict_level"] == 1.0]
    assert homogeneous["engagement_level"].nunique() == 1
    assert divergent["engagement_level"].nunique() > 1


def test_csv_sample_merges_and_exports_without_generator_changes(tmp_path):
    synthetic = ResearchDatasetGenerator(ResearchGenerationConfig(seed=42)).generate()
    merged = merge_csv_directory(synthetic, SAMPLE_CSV)
    validate_research_tables(merged)
    assert "sample-club-001" in set(merged["clubs"].club_id)
    assert "sample-event-001" in set(merged["events"].event_id)
    assert len(merged["formats"]) == 17
    write_csv_tables(merged, tmp_path)
    assert {f"{name}.csv" for name in merged} == {p.name for p in tmp_path.glob("*.csv")}


def test_csv_rows_override_generated_rows_on_primary_key(tmp_path):
    synthetic = ResearchDatasetGenerator(ResearchGenerationConfig(seed=42)).generate()
    original = synthetic["clubs"].iloc[0]["club_id"]
    tables_dir = tmp_path / "input"
    tables_dir.mkdir()
    pd.DataFrame([{"club_id": original, "name": "Imported replacement", "conflict_level": 0.1}]).to_csv(
        tables_dir / "clubs.csv", index=False
    )
    merged = merge_csv_directory(synthetic, tables_dir)
    row = merged["clubs"].set_index("club_id").loc[original]
    assert row["name"] == "Imported replacement"
    assert len(merged["clubs"]) == len(synthetic["clubs"])


def test_validator_rejects_foreign_key_and_enum_errors():
    tables = ResearchDatasetGenerator(ResearchGenerationConfig(seed=42)).generate()
    broken = {name: frame.copy() for name, frame in tables.items()}
    broken["events"].loc[0, "format_id"] = "missing-format"
    with pytest.raises(ValueError, match="unknown format"):
        validate_research_tables(broken)
    broken = {name: frame.copy() for name, frame in tables.items()}
    broken["availability"].loc[0, "status"] = "unavailable-ish"
    with pytest.raises(ValueError, match="availability.status"):
        validate_research_tables(broken)


def test_cli_summary_includes_each_club(capsys):
    report = generate_and_report(seed=42, num_clubs=6)
    output = capsys.readouterr().out
    assert report["clubs"] == 6
    assert "Per-club summary:" in output
    assert "Campus Club 6:" in output
    assert "conflict=" in output
