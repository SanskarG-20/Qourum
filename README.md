# Quorum

Quorum is a local-first recommender for choosing college club events. It ranks event types, dates, and start times using member preferences, availability, attendance history, scheduling constraints, and group decision strategies. The included data and evaluation are synthetic; they do not represent real clubs or members.

## Quick start

Requirements: Python 3.11+, Node.js 20.19+, npm, and GNU Make.

```sh
make setup
make seed SEED=42
make test
make dev
```

Open `http://127.0.0.1:5173/app` during development. For a single-origin build, run `make build` then `make run`. The application uses SQLite at `data/quorum.db`; runtime operation is local and does not require external services or network access. `make seed SEED=42` recreates the same synthetic dataset.

Useful commands:

| Command | Purpose |
| --- | --- |
| `make test` | Run the test suite and local-only checks |
| `make eval` | Run the five-seed temporal evaluation |
| `make simulate SEED=42` | Run a reproducible feedback simulation |
| `make build` / `make run` | Build and serve the application |

## Demo credentials

`make seed` creates these local demo accounts (all use the same role-specific password):

| Club | Organizer | Member |
| --- | --- | --- |
| ACM & Robotics Guild | `organizer.acm@quorum.local` | `member.acm@quorum.local` |
| Design & Creative Commons | `organizer.design@quorum.local` | `member.design@quorum.local` |
| Student AI & Data Society | `organizer.ai-data@quorum.local` | `member.ai-data@quorum.local` |

Organizer password: `QuorumOrganizer42!`. Member password: `QuorumMember42!`.

## Recommendation method

Individual scores combine explicit event-type ratings, recency-weighted attendance, smoothed weekday/hour affinity, and optional local description embeddings. Component weights and scoring constants are centralized in `backend/recsys/config.py`. Embeddings use the vendored `all-MiniLM-L6-v2` model and a SQLite text-hash cache; set `QUORUM_EMBEDDINGS_ENABLED=false` to disable them. Scoring and explanation rendering are deterministic, and the recommender does not use generator-only latent persona fields.

Candidate generation checks availability, member dealbreakers, existing events, holidays, exam periods, and quorum. Feasible candidates are aggregated using average, least misery, most pleasure, multiplicative, Borda, approval voting, or average-without-misery. Optional fairness weighting and diversity reranking affect group ranking. Explanations and “why not” comparisons render computed evidence with deterministic templates.

## Evaluation

Run `make eval` for the chronological 70/15/15 train/validation/test evaluation across five seeds. Tuning uses validation data only. Metrics cover individual ranking, group satisfaction and fairness, quorum success, attendance calibration, coverage, and list diversity. Baselines include random, popularity, recent-event, same-week-last-year, and aggregation-only approaches. Results and figures are written to `results/evaluation/`; see [`REPORT.md`](results/evaluation/REPORT.md) for the latest report.

The recorded benchmark measured p95 **258.36 ms** for 60 members and 500 candidates over 10 runs, with content evidence precomputed. It excludes database access and cold model loading/encoding.

In the five-seed embedding ablation, predicted mean satisfaction increased by **0.097** (paired 95% CI **[0.093, 0.101]**). Event-type hit-rate change was **0.032** (95% CI **[-0.079, 0.143]**), which was not significant; Brier score worsened by **0.025** (95% CI **[0.016, 0.033]**, lower is better). The recommender also trails club popularity on Precision@3, Recall@3, and NDCG@3 in the reported baseline comparison. Since both behavior and event descriptions are synthetic, these findings are weak evidence and do not establish real-world attendance or satisfaction gains.

## Data, security, and limitations

The seeded generator creates three clubs, 25–60 members per club, twelve event types, and 18 months of synthetic history, including cold-start, sparse-history, and interest-drifting members. Descriptions come from seeded templates and are not generated from latent personas. The feedback simulation uses the generator behavior model independently of recommender features.

SQLite is configured with foreign keys, WAL mode, and a busy timeout. Authentication uses Argon2id hashes, server-side SQLite sessions, HttpOnly SameSite cookies, CSRF protection, login throttling, and club-scoped role checks. `make test` includes a socket-blocking test and source checks for external services and unsafe references.

Key limitations: attendance is an imperfect proxy for interest; availability and one-hour slots simplify scheduling; attendance estimates assume additive member probabilities; offline evaluation cannot observe outcomes for unheld alternatives; and synthetic performance does not establish performance for a real college population. Group strategies and fairness weights encode configurable trade-offs rather than a universal fairness definition.
