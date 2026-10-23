# Quorum End-to-End Implementation Plan

**Goal:** Build Quorum as a deterministic, locally hosted group-aware event recommender with a Python API, SQLite persistence, local authentication, a functional React workflow, and reproducible evaluation.

**Architecture:** FastAPI serves the built React/Vite application and relative `/api` endpoints from one origin. SQLAlchemy 2.x persists application and simulation data to `data/quorum.db`; pure-Python recommendation logic lives in `backend/recsys`, separated from persistence, generation, and evaluation.

**Tech stack:** Python 3.11+, FastAPI, SQLAlchemy 2.x, SQLite, pandas, NumPy, SciPy, scikit-learn, pytest, matplotlib; existing React/Vite frontend. All dependencies will be version-pinned. Runtime has no external services or outbound network access.

**Source requirements:** User-provided Quorum end-to-end role, hard constraints, working protocol, and phases P0–P12 in the conversation dated 2026-10-23.

## Global constraints

- Runtime is fully local; SQLite database path is `data/quorum.db`.
- Remove existing Supabase code, dependencies, environment variables, and configuration.
- Self-host fonts and assets; apply CSP including `connect-src 'self'`.
- FastAPI serves the built frontend; frontend API calls are relative `/api`; Vite proxies API calls during development; no CORS configuration.
- Every random process accepts a seed; repeated runs with the same seed produce identical data, recommendations, and metrics.
- Recommendation scoring is pure Python with no I/O; explanations are deterministic templates based on computed evidence.
- Preserve the existing landing page build, design, and animations; new workflow is under `/app` routes.
- Never weaken tests to obtain a pass. No TODOs, stubs, mocks in place of production logic, or unsupported success claims.
- Work one phase at a time. At each phase boundary run the full suite and phase acceptance checks, include exact command output in the report, and commit. The user has authorized continuous work through P12, so proceed to the next phase without waiting.

## Phases

- [x] **P0 — Audit and cleanup:** Inspect and report the current stack and existing functionality. Remove Supabase, cloud-service references/configuration, and external runtime asset/font/analytics references. Add self-hosted assets and CSP. Preserve and build-check the landing page. Create `backend/app`, `backend/recsys`, `backend/simulation`, `backend/evaluation`, `backend/tests`, and `data/`; add `Makefile`, local-only `.env.example`, and database ignore rule.
- [x] **P1 — Data layer:** Implement SQLAlchemy models, constrained SQLite schema, parameterized repository layer, deterministic synthetic generator, clean database seed command, missing-database auto-seed, and latent-field leakage tests.
- [x] **P2 — Local auth:** Add Argon2id password hashing, SQLite server-side sessions, secure cookie settings, CSRF protection, login throttling, per-club authorization, and documented seeded demo accounts.
- [x] **P3 — Onboarding:** Add validated preference, availability, and dealbreaker APIs/UI; normalize non-overlapping availability; implement and flag cold-start fallback.
- [ ] **P4 — Individual scoring:** Implement pure, vectorized hybrid member scoring with explicit-rating, recency-weighted attendance, smoothed time affinity, confidence blending, component breakdowns, and determinism/bounds/monotonicity/cold-start tests.
- [ ] **P5 — Candidates, feasibility, quorum:** Generate configurable event/date/start candidates; apply venue, existing-event, calendar, and dealbreaker constraints; calculate availability and expected attendance; apply configurable quorum and reason codes with tests for each reason.
- [ ] **P6 — Group aggregation:** Implement all requested aggregation strategies, decaying fairness-ledger weights, MMR diversity re-ranking, per-member satisfaction output, and toy-group/fairness tests.
- [ ] **P7 — Recommendation API:** Add organizer-only recommendation endpoint with validated parameters and error codes; benchmark p95 for 60 members × 500 candidates and report measured results.
- [ ] **P8 — Explanations:** Produce structured evidence, deterministic explanation templates, and counterfactual “why not” explanations; verify rendered numbers against evidence.
- [ ] **P9 — Feedback and simulation:** Record attendance/ratings; update scores and fairness ledger without future-data leakage; simulate seeded recommendation/attendance/feedback rounds using generator-only latent behavior; report satisfaction and quorum trends.
- [ ] **P10 — Evaluation:** Implement temporal 70/15/15 splits, validation-only tuning, required individual/group metrics, baselines, ablations, five or more seeds, means and 95% confidence intervals, paired comparisons, CSVs, and matplotlib figures. Report results honestly, including baseline losses.
- [ ] **P11 — App workflow UI:** Under `/app`, implement organizer controls, recommendation detail/explanations, what-if, event acceptance, RSVP, attendance recording, feedback updates, and member-role 403 behavior. Reuse existing visual tokens/components without animation work.
- [ ] **P12 — Hardening and docs:** Add property, auth, role, CSRF, injection, XSS, fuzz, and socket-blocking tests; prove no runtime outbound access; scan source for Supabase/CDN/external URL references; perform clean-clone offline setup; write methodology, math, architecture, assumptions, limitations, demo script, and evaluation report outline; list issues by severity and fix all critical issues.

## Phase log

- **Baseline audit:** The tracked application was React 18 with Vite 5 and a browser-only JavaScript recommender/demo. The workspace also contained untracked Python synthetic-data tools, SQL migrations/seeds, a remote database seeder, cloud environment variables, an external-font link, and a static-hosting config. There was no FastAPI application or local database.
- **P0 complete:** Pinned the local Python/JavaScript dependency sets, bundled the landing page fonts, added a self-only CSP and Vite API proxy, added FastAPI static/SPA serving, removed remote database/deployment code and configuration, and created the requested directory skeleton and local Makefile/environment template. Existing landing design and animations were preserved.
- **P0 verification:** `npm run build` passed (Vite 8.3.5); `npm run verify` passed (all documented invariants hold); `py -3.11 -m pytest backend/tests -q` passed (6 tests); `npm audit --audit-level=moderate` reported zero vulnerabilities; `py -3.11 -m pip check` reported no broken requirements; local FastAPI/Vite smoke checks passed for health, SPA fallback, font MIME, CSP, and `/api` proxy. GNU Make is not installed on this host; requested targets were validated statically and their runnable underlying commands were smoke-checked.
- **P1 complete:** Added constrained SQLAlchemy models for all requested data tables, SQLite FK/WAL/timeout configuration, bound-parameter repository queries, deterministic SQLite rebuild seeding, server-startup seeding when the configured DB is missing, and an AST test guarding `backend/recsys` against hidden generator fields. The existing seeded generator supplies three clubs, 25–60 members each, twelve event types, 18 months of history, and synthetic cold-start, sparse, and interest-drifting members.
- **P1 verification:** `py -3.11 -m app.seed --seed 42` rebuilt `data/quorum.db` with 3 clubs, 124 users, 124 memberships, 12 event types, 148 events, 6,026 RSVPs, 943 preferences, 4,713 availability windows/overrides, and 16 calendar periods. `py -3.11 -m pytest backend/tests -q` passed (11 tests); `npm run verify` passed (all documented invariants hold); `npm run build` passed (Vite 8.3.5, 39 modules; existing bundle-size warning remains); `py -3.11 -m pip check` reported no broken requirements; `git diff --check` passed.
- **P2 complete:** Added Argon2id password hashing; seeded organizer/member accounts for each synthetic club; hashed opaque server-side sessions with HttpOnly/SameSite=Lax cookies; CSRF validation for login/logout; SQLite-backed lockouts after five failed attempts; authenticated identity and club-scoped event/directory endpoints with member/organizer authorization. Demo credentials and API flow are documented in the README. Added pinned HTTPX for local ASGI integration tests, justified in `DEPENDENCIES.md`.
- **P2 verification:** `py -3.11 -m app.seed --seed 42` populated 3 clubs, 130 users, 130 memberships, 12 event types, 148 events, 6,026 RSVPs, 943 preferences, 4,713 availability windows/overrides, and 16 calendar periods. `py -3.11 -m pytest backend/tests -q` passed (16 tests; one upstream Starlette/AnyIO deprecation warning). `npm run verify` passed (all documented invariants hold); `npm run build` passed (Vite 8.3.5, 39 modules; existing bundle-size warning remains); `py -3.11 -m pip check` reported no broken requirements.
- **P3 complete:** Added member onboarding API and `/app` UI for event-type ratings, weekly one-hour availability, and latest-start dealbreakers. Availability is replaced atomically and overlapping ranges are rejected; onboarding reports an attendance-based `is_cold_start` flag and deterministic club-popularity fallback. The root landing page remains the default route.
- **P3 verification:** `py -3.11 -m pytest backend/tests -q` passed (17 tests; one upstream Starlette/AnyIO deprecation warning); `npm run build` passed (41 modules; existing large-bundle advisory); `npm run verify` reported `All documented invariants hold.`; `py -3.11 -m pip check` reported `No broken requirements found.`; `py -3.11 -m app.seed --seed 42` rebuilt 3 clubs, 130 users, 12 event types, 148 events and the expected synthetic history; `git diff --check` passed.
