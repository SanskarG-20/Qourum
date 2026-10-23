"""
Tests for Synthetic Data Generator and Hard Boundary Enforcement.
Ensures:
1. Hard rule compliance: zero latent fields leak into feature tables.
2. Seed reproducibility: same seed -> exact same output.
3. Populations: cold-start (<3 events), sparse, and drifting members.
4. Academic calendar impact: exam week attendance dips.
5. Structural targets: 3 clubs (25-60 members each), 12 event types, 18-month simulation.
"""

import pytest
import pandas as pd
from datetime import date
import ast
import inspect
import textwrap

from backend.synthetic_data.generator import SyntheticDatasetGenerator, GenerationConfig
from backend.synthetic_data.exporter import (
    export_feature_datasets,
    _validate_clean_columns,
    PROHIBITED_LATENT_SUBSTRINGS,
)
from backend.synthetic_data.calendar import is_exam_period


@pytest.fixture(scope="module")
def generator_seed42():
    config = GenerationConfig(seed=42)
    gen = SyntheticDatasetGenerator(config=config)
    gen.generate_all()
    return gen


def test_structural_dimensions(generator_seed42):
    """Verifies 3 clubs with 25-60 members and 12 event types."""
    assert len(generator_seed42.clubs) == 3
    for club in generator_seed42.clubs:
        assert 25 <= len(club.members) <= 60, f"Club {club.name} size {len(club.members)} outside [25, 60]"

    assert len(generator_seed42.event_types) == 12


def test_seed_reproducibility():
    """Verifies that the same seed produces identical results, and different seeds differ."""
    gen1 = SyntheticDatasetGenerator(GenerationConfig(seed=101))
    gen1.generate_all()

    gen2 = SyntheticDatasetGenerator(GenerationConfig(seed=101))
    gen2.generate_all()

    gen_diff = SyntheticDatasetGenerator(GenerationConfig(seed=999))
    gen_diff.generate_all()

    # Identical seed verification
    assert len(gen1.events) == len(gen2.events)
    assert len(gen1.rsvps) == len(gen2.rsvps)

    rsvps1 = [r.attended for r in gen1.rsvps]
    rsvps2 = [r.attended for r in gen2.rsvps]
    assert rsvps1 == rsvps2

    # Different seed verification
    rsvps_diff = [r.attended for r in gen_diff.rsvps]
    assert rsvps1 != rsvps_diff


def test_descriptions_are_seeded_varied_and_share_vocabulary():
    first = SyntheticDatasetGenerator(GenerationConfig(seed=101))
    repeated = SyntheticDatasetGenerator(GenerationConfig(seed=101))
    changed = SyntheticDatasetGenerator(GenerationConfig(seed=102))
    for generator in (first, repeated, changed):
        generator.generate_all()
    first_type_descriptions = [item.description for item in first.event_types]
    assert first_type_descriptions == [item.description for item in repeated.event_types]
    assert [item.description for item in first.events] == [item.description for item in repeated.events]
    assert first_type_descriptions != [item.description for item in changed.event_types]
    assert len({event.description for event in first.events[:20]}) > 1
    assert all("club community" in description.lower() for description in first_type_descriptions)
    exported = export_feature_datasets(first)
    assert "description" in exported["events"].columns
    assert exported["events"]["description"].notna().all()


def test_description_renderer_has_no_latent_feature_access():
    source = inspect.getsource(SyntheticDatasetGenerator._description_for)
    tree = ast.parse(textwrap.dedent(source))
    identifiers = [node.id.lower() for node in ast.walk(tree) if isinstance(node, ast.Name)]
    identifiers.extend(node.attr.lower() for node in ast.walk(tree) if isinstance(node, ast.Attribute))
    for forbidden in ("latent", "persona", "activity_tier", "attendance", "club_metadata"):
        assert forbidden not in identifiers


def test_hard_rule_no_latent_fields_leakage(generator_seed42):
    """
    HARD RULE TEST:
    The recommender and public tables must NEVER import or receive latent columns.
    Every exported DataFrame is verified to have zero latent/hidden attributes.
    """
    datasets = export_feature_datasets(generator_seed42)

    for table_name, df in datasets.items():
        assert isinstance(df, pd.DataFrame), f"{table_name} is not a DataFrame"
        for col in df.columns:
            col_lower = str(col).lower()
            for banned in PROHIBITED_LATENT_SUBSTRINGS:
                assert banned not in col_lower, (
                    f"VIOLATION: Prohibited latent substring '{banned}' found in public table '{table_name}', column '{col}'!"
                )


def test_validator_fails_on_injected_latent_column():
    """Verifies that the column validator actively raises an exception if a latent column is injected."""
    leaked_df = pd.DataFrame({
        "id": [1, 2],
        "member_name": ["Alice", "Bob"],
        "latent_persona_vector": [[0.5, 0.2], [0.1, 0.9]],
    })

    with pytest.raises(ValueError, match="CRITICAL PRIVACY VIOLATION"):
        _validate_clean_columns(leaked_df, "test_table")


def test_cold_start_and_sparse_members(generator_seed42):
    """Verifies cold-start (<3 events) and sparse members exist and meet criteria."""
    all_members = [m for c in generator_seed42.clubs for m in c.members]
    cold_start = [m for m in all_members if m.activity_tier == "cold_start"]
    sparse = [m for m in all_members if m.activity_tier == "sparse"]
    drifting = [m for m in all_members if m.is_drifting]

    assert len(cold_start) > 0, "No cold-start members found"
    assert len(sparse) > 0, "No sparse members found"
    assert len(drifting) > 0, "No drifting members found"

    # Count actual attendance from RSVPs
    rsvps_df = export_feature_datasets(generator_seed42)["rsvps"]
    attended_counts = rsvps_df[rsvps_df["attended"] == True].groupby("member_id").size().to_dict()

    for m in cold_start:
        count = attended_counts.get(m.id, 0)
        assert count < 3, f"Cold-start member {m.name} attended {count} events (must be < 3)!"


def test_exam_week_attendance_dip(generator_seed42):
    """Verifies that attendance rate dips significantly during exam weeks."""
    datasets = export_feature_datasets(generator_seed42)
    events_df = datasets["events"]
    rsvps_df = datasets["rsvps"]

    merged = rsvps_df.merge(events_df[["id", "start_time"]], left_on="event_id", right_on="id")
    merged["is_exam"] = merged["start_time"].apply(lambda t: is_exam_period(date.fromisoformat(t[:10])))

    regular_rate = merged[merged["is_exam"] == False]["attended"].mean()
    exam_rate = merged[merged["is_exam"] == True]["attended"].mean()

    assert exam_rate < regular_rate, f"Exam attendance ({exam_rate:.2f}) not lower than regular ({regular_rate:.2f})"
    assert exam_rate < regular_rate * 0.70, f"Exam dip ({exam_rate:.2f} vs {regular_rate:.2f}) not sufficiently pronounced"
