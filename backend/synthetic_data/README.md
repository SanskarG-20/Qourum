# Synthetic research data

This package generates entirely synthetic collegiate club data for testing and research. It simulates three clubs, 124 members, twelve event types, and approximately eighteen months of club activity. The generator uses hidden personas, slot preferences, exam periods, repeat-event fatigue, interest drift, and seeded noise to produce observable preferences, availability, attendance, and ratings.

Hidden generation traits are internal only. Exported feature tables are checked to prevent latent or ground-truth fields from leaking into recommender inputs.

Generate and summarize data reproducibly with:

```sh
python -m backend.synthetic_data.cli --seed 42
```

The same seed produces the same generated data. These data are simulated and must not be described as collected from real students or clubs.
