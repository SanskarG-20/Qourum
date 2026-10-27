"""Generate the reproducible research dataset and print per-club summaries."""

import argparse
from pathlib import Path

from .csv_merge import merge_csv_directory, write_csv_tables
from .dataset_validation import validate_research_tables
from .research_dataset import ResearchDatasetGenerator, ResearchGenerationConfig


def generate_and_report(
    seed: int = 42,
    output_dir: str | Path | None = None,
    real_csv_dir: str | Path | None = None,
    history_months: int = 18,
    num_clubs: int = 5,
) -> dict[str, int]:
    """Generate, optionally merge CSV input/export CSV output, validate, and report."""
    tables = ResearchDatasetGenerator(ResearchGenerationConfig(
        seed=seed, history_months=history_months, num_clubs=num_clubs
    )).generate()
    if real_csv_dir is not None:
        tables = merge_csv_directory(tables, real_csv_dir)
    validate_research_tables(tables)
    report = {"seed": seed, "clubs": len(tables["clubs"]), "members": len(tables["members"]),
              "formats": len(tables["formats"]), "events": len(tables["events"]),
              "attendance_rows": len(tables["attendance"])}
    print(f"Research dataset (seed={seed})")
    for key, value in report.items():
        if key != "seed":
            print(f"{key.replace('_', ' ').title()}: {value}")
    registered_rows = tables["attendance"][tables["attendance"]["registered"]]
    attendance_rate = float(registered_rows["attended"].mean()) if not registered_rows.empty else 0.0
    print(f"Registered attendance rate: {attendance_rate:.3f}")
    per_club_members = tables["members"].groupby("club_id").size()
    per_club_events = tables["events"].groupby("club_id").size()
    club_info = tables["clubs"].set_index("club_id")
    print("Per-club summary:")
    for club_id, club in club_info.iterrows():
        club_events = tables["events"][tables["events"]["club_id"] == club_id]
        mean_attendance = float((club_events["attended_count"] / club_events["registrations"].replace(0, 1)).mean()) if not club_events.empty else 0.0
        print(f"  {club['name']}: conflict={club['conflict_level']:.2f}, {int(per_club_members.get(club_id, 0))} members, {int(per_club_events.get(club_id, 0))} events, registered attendance={mean_attendance:.3f}")
    if output_dir is not None:
        write_csv_tables(tables, output_dir)
        print(f"CSV tables: {Path(output_dir)}")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate reproducible synthetic Quorum data")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--history-months", type=int, choices=range(12, 25), default=18)
    parser.add_argument("--clubs", type=int, choices=(5, 6), default=5)
    parser.add_argument("--output-dir", type=Path, help="Write the seven normalized tables as CSV")
    parser.add_argument("--real-csv-dir", type=Path, help="Overlay matching table CSVs by primary key before validation")
    args = parser.parse_args()
    generate_and_report(seed=args.seed, output_dir=args.output_dir, real_csv_dir=args.real_csv_dir,
                        history_months=args.history_months, num_clubs=args.clubs)


if __name__ == "__main__":
    main()
