# Quorum

Quorum is a group-aware event recommender for college clubs. It ranks event type and meeting-time options using member preferences, availability, and attendance history, with group aggregation strategies that expose fairness trade-offs.

## Current status

P0 and P1 establish the local-only foundation and deterministic SQLite data layer. The authenticated workflow and Python recommendation logic are scheduled for later phases. The existing React/Vite landing page and illustrative browser demo remain available; the browser demo does not persist data.

## Stack

- Python 3.11+, FastAPI, SQLAlchemy 2.x, SQLite
- pandas, NumPy, SciPy, scikit-learn, pytest, matplotlib
- React 18 and Vite 8

Direct dependencies are pinned in `requirements.txt` and `package.json`; npm's lockfile pins the full JavaScript dependency tree. Font packages are build-time inputs used to bundle the existing typefaces locally, removing browser requests to a font CDN.

## Local development

Requirements: Python 3.11+, Node.js 20.19+ (or 22.12+), npm, and GNU Make.

```sh
make setup
make dev
```

The landing page is served by Vite at `http://127.0.0.1:5173`. During development, start `make run` in a second terminal; Vite proxies `/api` to the local FastAPI server on port 8000. `make run` builds and serves the frontend and API from one origin.

Useful commands:

```sh
make test    # JavaScript verification harness and Python tests
make build   # production frontend build
make run     # local FastAPI server
make seed    # rebuild data/quorum.db with the selected deterministic seed
make eval    # current seeded verification harness
```

The seed command rebuilds the local SQLite database. The FastAPI server also seeds it when the database file is missing. To run the CLI directly, use `cd backend && python -m app.seed --seed 42`. Override `PYTHON` or `SEED` when needed, for example `make seed PYTHON="py -3.11" SEED=42` on Windows.

## Recommendation approach

The system is designed to score individual member-event-time combinations, filter infeasible options, aggregate member satisfaction using a selectable group strategy, and return ranked recommendations with deterministic evidence-based explanations. Recommendation scoring will be a pure Python package; persistence, simulation, API, and evaluation are separate layers.

The current browser demo contains an earlier JavaScript prototype. Its fixed evaluation figures are reference values, not measured results. `make eval` currently runs that seeded verification harness; the formal temporal evaluation and baselines are scheduled for P10, with results reported alongside their limitations.

## Data and privacy

The bundled demo and generated research data are synthetic. The simulator uses hidden latent personas only to generate behavior; recommendation features must contain observable preferences, availability, attendance, and ratings only. Synthetic or sample data must not be represented as collected club data.

Runtime operation is local and requires no cloud service, external API, analytics, or telemetry. Fonts and photography are bundled with the application. The database is stored at `data/quorum.db` and ignored by Git.

## Project layout

```text
backend/app/          FastAPI application and persistence
backend/recsys/       Pure recommendation logic
backend/synthetic_data/  Reproducible synthetic research data generator
backend/simulation/      Feedback simulation (later phase)
backend/evaluation/      Temporal evaluation and reporting
backend/tests/           Backend tests
src/                     Existing React/Vite landing page and future /app UI
data/                    Local SQLite database (not committed)
```
