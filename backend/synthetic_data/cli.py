"""Generate a reproducible synthetic dataset and print a concise summary."""

import argparse

from .exporter import export_feature_datasets
from .generator import GenerationConfig, SyntheticDatasetGenerator


def generate_and_report(seed: int = 42) -> dict[str, int]:
    """Generate a seeded dataset and report its dimensions and segments."""
    generator = SyntheticDatasetGenerator(GenerationConfig(seed=seed))
    generator.generate_all()
    datasets = export_feature_datasets(generator)
    events = datasets["events"]
    rsvps = datasets["rsvps"]
    merged = rsvps.merge(events[["id", "club_id", "event_type_id", "slot_name", "start_time"]],
                         left_on="event_id", right_on="id", suffixes=("_rsvp", "_event"))
    members = [member for club in generator.clubs for member in club.members]
    report = {
        "seed": seed,
        "clubs": len(generator.clubs),
        "members": len(members),
        "events": len(generator.events),
        "rsvps": len(generator.rsvps),
        "cold_start_members": sum(member.activity_tier == "cold_start" for member in members),
        "sparse_members": sum(member.activity_tier == "sparse" for member in members),
        "drifting_members": sum(member.is_drifting for member in members),
    }
    print(f"Synthetic dataset (seed={seed})")
    for key, value in report.items():
        if key != "seed":
            print(f"{key.replace('_', ' ').title()}: {value}")
    attendance_rate = float(merged["attended"].mean()) if not merged.empty else 0.0
    print(f"Attendance rate: {attendance_rate:.3f}")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate reproducible synthetic Quorum data")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()
    generate_and_report(seed=args.seed)


if __name__ == "__main__":
    main()
