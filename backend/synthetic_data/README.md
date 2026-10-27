# Synthetic data

This package contains two independent generators:

- The app seed generator (`SyntheticDatasetGenerator`) creates app-compatible clubs, event types, events, preferences, availability, and RSVPs.
- The research generator (`ResearchDatasetGenerator`) creates the expanded 16-format dataset and supports validated CSV overlays.

See [`docs/data.md`](../../docs/data.md) for the research table schema, CLI commands, CSV merge rules, and every synthetic behavior assumption. All generated values are synthetic.
