"""Load normalized CSV table files and merge real rows over synthetic rows."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from .dataset_validation import PRIMARY_KEYS, TABLE_COLUMNS, validate_research_tables

BOOL_COLUMNS = {
    "formats": ("team_based",),
    "calendar": ("exam_week", "holiday", "fest_week", "lab_heavy_day"),
    "attendance": ("registered", "attended"),
}
INT_COLUMNS = {
    "members": ("year", "max_fee"),
    "formats": ("duration_hrs", "typical_fee", "prep_days", "min_capacity", "max_capacity"),
    "availability": ("day_of_week",),
    "events": ("fee", "capacity", "registrations", "attended_count"),
    "attendance": ("rating",),
}


def _normalize_csv(name: str, path: Path) -> pd.DataFrame:
    frame = pd.read_csv(path, dtype=str, keep_default_na=True)
    missing = set(TABLE_COLUMNS[name]) - set(frame.columns)
    if missing:
        raise ValueError(f"{path} is missing columns: {', '.join(sorted(missing))}")
    frame = frame[list(TABLE_COLUMNS[name])].copy()
    for column in BOOL_COLUMNS.get(name, ()):
        values = frame[column].str.strip().str.lower()
        invalid = ~values.isin({"true", "false", "1", "0"})
        if invalid.any():
            raise ValueError(f"{path}: invalid boolean in {column}")
        frame[column] = values.map({"true": True, "1": True, "false": False, "0": False})
    for column in INT_COLUMNS.get(name, ()):
        frame[column] = pd.to_numeric(frame[column], errors="raise").astype("Int64" if name == "attendance" and column == "rating" else "int64")
    if name == "clubs":
        frame["conflict_level"] = pd.to_numeric(frame["conflict_level"], errors="raise")
    if name == "events":
        for column in ("date",):
            frame[column] = pd.to_datetime(frame[column], format="%Y-%m-%d", errors="raise").dt.strftime("%Y-%m-%d")
    if name == "calendar":
        frame["date"] = pd.to_datetime(frame["date"], format="%Y-%m-%d", errors="raise").dt.strftime("%Y-%m-%d")
    if name == "members":
        frame["join_month"] = pd.to_datetime(frame["join_month"], format="%Y-%m", errors="raise").dt.strftime("%Y-%m")
    return frame


def merge_csv_directory(tables: dict[str, pd.DataFrame], csv_dir: str | Path) -> dict[str, pd.DataFrame]:
    """Merge any matching `<table>.csv` files, with CSV rows winning by primary key.

    IDs in imported tables must reference IDs in the final merged tables. Files may
    be omitted when only selected tables need overrides; the resulting dataset is
    validated as one unit before it is returned.
    """
    directory = Path(csv_dir)
    merged = {name: frame.copy() for name, frame in tables.items()}
    for name in TABLE_COLUMNS:
        path = directory / f"{name}.csv"
        if not path.exists():
            continue
        incoming = _normalize_csv(name, path)
        keys = list(PRIMARY_KEYS[name])
        base = merged[name].copy()
        # Preserve generated rows not replaced by imported keys; imported values win.
        incoming_key_frame = incoming[keys].astype(str)
        base_key_frame = base[keys].astype(str)
        incoming_key_tuples = set(map(tuple, incoming_key_frame.to_numpy()))
        keep = [tuple(row) not in incoming_key_tuples for row in base_key_frame.to_numpy()]
        merged[name] = pd.concat([base.loc[keep], incoming], ignore_index=True)
    validate_research_tables(merged)
    return merged


def write_csv_tables(tables: dict[str, pd.DataFrame], output_dir: str | Path) -> None:
    """Write all tables in stable column order for reproducible local artifacts."""
    validate_research_tables(tables)
    target = Path(output_dir)
    target.mkdir(parents=True, exist_ok=True)
    for name, columns in TABLE_COLUMNS.items():
        tables[name][list(columns)].to_csv(target / f"{name}.csv", index=False, lineterminator="\n")
