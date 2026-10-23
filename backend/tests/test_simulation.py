"""The complete synthetic feedback simulation is seeded and repeatable."""

import csv

from backend.simulation.runner import run_simulation


def test_simulation_rounds_and_csv_are_reproducible(tmp_path):
    first_path = tmp_path / "first.csv"
    second_path = tmp_path / "second.csv"
    first = run_simulation(42, 2, first_path)
    second = run_simulation(42, 2, second_path)
    assert first == second
    assert first_path.read_bytes() == second_path.read_bytes()
    assert len(first) == 2
    assert all(row["event_type"] for row in first)
    with first_path.open(encoding="utf-8", newline="") as stream:
        assert len(list(csv.DictReader(stream))) == 2
