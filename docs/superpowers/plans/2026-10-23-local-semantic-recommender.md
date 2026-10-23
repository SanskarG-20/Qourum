# Local Semantic Recommender Implementation Plan

> **For agentic workers:** Execute inline in this task, one task at a time. Update each checkbox with verified results. Do not use subagents unless the user explicitly requests delegation.

**Goal:** Add deterministic local event-description embeddings, cache them in SQLite, incorporate content similarity into member scores without temporal leakage, and quantify the effect with a five-seed paired ablation.

**Architecture:** A local embedding service loads the vendored MiniLM model with network access disabled, persists sentence vectors in a SQLite cache, and builds profiles from attended event descriptions strictly before each scoring cutoff. The pure recsys package receives numeric content evidence and performs the scoring blend; the evaluation runner uses the same cutoff-aware feature path and compares the normal model with a no-embeddings ablation.

**Tech Stack:** Existing Python 3.11+, FastAPI, SQLAlchemy, SQLite, NumPy/pandas/SciPy, pytest and matplotlib; pinned `sentence-transformers` and compatible CPU PyTorch dependency; vendored `all-MiniLM-L6-v2` safetensors model files; existing React/Vite.

**Spec:** `docs/superpowers/specs/2026-10-23-local-semantic-recommender-design.md`

## Global Constraints

- The project remains local-only. The sole model runtime is the vendored in-process sentence-transformers model loaded with `local_files_only=True`; no other outbound runtime access is allowed.
- Every direct and transitive Python dependency remains exactly version pinned, with a one-line justification for the sentence-transformers and CPU inference additions.
- Do not implement optional E3/Ollama in this change. Do not add Ollama ports or exceptions to the socket guard or CSP.
- Text features, embeddings, model use, explanations and evaluations are deterministic within the pinned CPU environment.
- `backend/recsys` remains I/O-free. Database access, embedding model calls, and cache reads/writes live in application/feature assembly code.
- Hidden latent persona/event-type attributes must not influence description generation or be available to the recommender.
- Evaluation stays chronological 70/15/15; no future or held-out observations enter member profiles; the generator must not be altered to create a model gain.
- Keep existing API compatibility, landing-page behavior, seeded determinism, and full test suite. Do not weaken existing tests.

---

## File Map

- Modify `requirements.txt` and `DEPENDENCIES.md` to lock and justify the new runtime libraries.
- Add `backend/models/all-MiniLM-L6-v2/` with only the pinned model revision's required tokenizer/config/pooling files and safetensors weights; add model revision, SHA-256 checksums, and Apache-2.0 notice in `backend/models/README.md`.
- Modify `backend/app/models.py`, `backend/app/database.py`, `backend/app/seed.py`, `backend/app/event_workflow.py`, and `backend/app/recommendations.py` for event descriptions, cache table, compatible migration, seed persistence, and API feature assembly.
- Modify `backend/synthetic_data/models.py`, `backend/synthetic_data/generator.py`, and `backend/synthetic_data/exporter.py` to generate/export varied descriptions independently of latent data.
- Add `backend/app/embedding_service.py` for local model initialization, text hashing/cache access, event history profiles, and member-candidate content evidence.
- Modify `backend/recsys/config.py` and `backend/recsys/individual.py` to add the pure similarity component and confidence blend.
- Modify `backend/evaluation/runner.py` and evaluation output artifacts under `results/evaluation/` to add `ablation_no_embeddings`, paired confidence intervals, and factual interpretation.
- Add or extend tests under `backend/tests/` for model loading, cache correctness, deterministic descriptions and scoring, leakage, local-only inference, schema upgrade, and evaluation reports.
- Update `README.md`, `DEPENDENCIES.md`, and the root implementation plan `PLAN.md` with the verified outcome, significance result, synthetic-data caveat, and phase evidence.

## Proposed Interfaces

Use a frozen `ContentSignal` dataclass with `similarity: float` and `observation_count: int`. Define `encode_and_cache(session: sqlalchemy.orm.Session, texts: Sequence[str]) -> dict[str, numpy.ndarray]` and `content_evidence_for_candidate(session: sqlalchemy.orm.Session, member_ids: Sequence[str], event_type_id: str, cutoff: datetime) -> dict[str, ContentSignal]` in `backend/app/embedding_service.py`. Extend `score_members` with keyword-only `content_evidence: Mapping[str, ContentSignal] | None = None` and `content_enabled: bool = True`, returning the existing `list[MemberScore]` interface with added evidence fields. `ContentSignal` and numeric mappings are plain immutable/in-memory inputs. `content_evidence_for_candidate` can query SQLite and invoke the encoder; `score_members` cannot.

## Tasks

### Task 1: Pin and vendor the local embedding runtime

**Files:** `requirements.txt`, `DEPENDENCIES.md`, `backend/models/all-MiniLM-L6-v2/*`, `backend/models/README.md`, `backend/tests/test_embedding_service.py`.

- [x] Pin every newly introduced direct/transitive package and document each addition in one line; install/import/local inference verified on Windows Python 3.11.
- [ ] Verify the pinned CPU-only Torch and sentence-transformers install on Linux (no Linux environment is available in this workspace).
- [x] Download the selected model at a fixed immutable revision. Vendor only `model.safetensors`, model/tokenizer configs, tokenizer vocabulary/data, `modules.json`, and pooling config needed by sentence-transformers; do not include duplicate `.bin`, TensorFlow, Rust, OpenVINO, or ONNX exports.
- [x] Record the upstream model ID, revision SHA, Apache-2.0 attribution, included file list, and each included file's SHA-256 in `backend/models/README.md`.
- [x] Add a test loading the vendored absolute directory path with `local_files_only=True`, `trust_remote_code=False`, and CPU device; encode the same short text twice and assert shape `(1, 384)`, finite normalized output, and equality within a strict tolerance.
- [x] Run the new model smoke test with DNS/TCP/UDP network guards active. Verify missing model files raise a local error rather than triggering a download.
- [x] Run `py -3.11 -m pytest backend/tests/test_embedding_service.py -q` and `py -3.11 -m pip check`.

### Task 2: Add seeded, non-latent event descriptions

**Files:** `backend/synthetic_data/models.py`, `backend/synthetic_data/generator.py`, `backend/synthetic_data/exporter.py`, `backend/tests/test_synthetic_data.py`, `backend/tests/test_data_layer.py`.

- [x] Add `description: str` to the synthetic event record. Keep existing `SyntheticEventType.description` as the event-type description field.
- [x] Replace category/latent-correlated event-type description literals with a small fixed set of varied grammatical templates and shared vocabulary. Select description variations only from generator RNG state and event identity/order, never from `latent_attributes`, `latent_persona`, club persona distributions, activity tier, or generated attendance outcomes.
- [x] Generate event descriptions using a seeded template with overlapping terms across event types, based only on public event-type description/name plus fixed generic topic/activity phrase lists; make multiple events of one type vary deterministically.
- [x] Export the event description column and continue `_validate_clean_columns` checks for latent field leakage.
- [x] Add tests that two same-seed dataset generations produce identical descriptions and a different seed changes at least some variation; tests cover seeded descriptions, shared vocabulary, and clean export columns.
- [x] Run `py -3.11 -m pytest backend/tests/test_synthetic_data.py backend/tests/test_data_layer.py -q` and `py -3.11 -m app.seed --seed 42`.

### Task 3: Persist descriptions and SQLite embedding cache

**Files:** `backend/app/models.py`, `backend/app/database.py`, `backend/app/seed.py`, `backend/app/event_workflow.py`, `backend/tests/test_data_layer.py`, `backend/tests/test_event_workflow.py`.

- [x] Add non-null text description to `Event` with a backwards-compatible SQL default. `EventType.description` already exists and is populated from the generator.
- [x] Add an `EmbeddingCache` model with composite identity `(text_sha256, model_revision)`, binary float32 vector, dimension, and creation timestamp. Add constraints for a 64-character lowercase SHA-256 key and positive dimension.
- [x] Add idempotent SQLite schema upgrade logic that adds `events.description` to an existing P0–P12 database and creates the cache table without dropping user data. New databases use normal metadata creation. Existing empty descriptions receive the related event-type description during migration/backfill.
- [x] Persist exported synthetic event descriptions through `seed_database`. Accepted scheduled events use the type description by default; response JSON returns the stored event description.
- [x] Test deterministic rebuild equality, old-schema upgrade and idempotence, cache uniqueness/FK constraints if any, and API event-description round-trip.
- [x] Run focused data/event tests and full suite: focused tests passed (7); final suite passed (56 tests; one upstream Starlette/AnyIO deprecation warning).

### Task 4: Implement pure content scoring and SQLite-backed feature assembly

**Files:** `backend/recsys/config.py`, `backend/recsys/individual.py`, `backend/app/embedding_service.py`, `backend/app/recommendations.py`, `backend/tests/test_individual_scoring.py`, `backend/tests/test_embedding_service.py`, `backend/tests/test_recommendation_api.py`.

- [x] Add config constants for content base weight, confidence prior, and half-life. Embeddings default enabled; `QUORUM_EMBEDDINGS_ENABLED=false` disables them. Preserve other component relative weights, then normalize available evidence weights.
- [x] Add frozen `ContentSignal(similarity, observation_count)` and `content_similarity`/confidence fields to score evidence. Extend `score_members` with optional mapping and enable flag; absent/disabled content preserves the old score path.
- [x] In `embedding_service.py`, lazily instantiate the CPU sentence-transformer from the resolved repo-local path with `local_files_only=True`, `trust_remote_code=False`, and fixed encode options. No hub helpers or external cache paths are used.
- [x] Normalize whitespace before SHA-256 hashing. Include model revision in the unique cache key. Query cached vectors, batch-encode misses, validate dimension/finite float32 values, persist them, and return stable mappings.
- [x] Build profiles from same-club attended event descriptions with `event.start_time < cutoff`; use exponential half-life weights. Compare each candidate type description, map cosine to `[0,1]`, and include observation count. No profile yields no content signal.
- [x] Add tests for cache hits (encoder called once), key changes for changed text/revision, vector integrity, deterministic profile similarity, cold-start candidate type with existing member profile, no-attendance member behavior, and cutoff exclusion of equal/future events.
- [x] Add scorer unit tests for boundedness, determinism, no-content parity, isolated similarity monotonicity, content confidence, and unchanged explicit/attendance/time monotonicity.
- [x] Run pure scorer tests and embedding integration tests while the outbound DNS/socket blocker is active.

### Task 5: Integrate event workflow and deterministic evidence

**Files:** `backend/app/recommendations.py`, `backend/app/event_workflow.py`, `backend/recsys/explanations.py`, `backend/tests/test_recommendation_api.py`, `backend/tests/test_explanations.py`, `backend/tests/test_event_workflow.py`.

- [x] Build one club-scoped content-evidence map from event history and pass numeric inputs to `score_members`; no model or ORM I/O enters `backend/recsys`.
- [x] Honor the local switch: disabled returns before model import, cache reads, or writes; enabled uses only local vendored weights and SQLite vectors.
- [x] Retain content similarity in structured component evidence and deterministic top-factor templates.
- [x] Ensure accepted event descriptions and member event listings use the persisted text field; existing React escaped rendering is unchanged.
- [x] Test role/CSRF behavior, disabled-feature short-circuiting, and numeric explanation evidence.
- [x] Run recommendation, explanation, event workflow, and full suite tests (56 passed).

### Task 6: Add leakage-safe temporal ablation and confidence report

**Files:** `backend/evaluation/runner.py`, `backend/tests/test_evaluation.py`, `results/evaluation/REPORT.md`, `results/evaluation/metrics_by_seed.csv`, `results/evaluation/summary_95ci.csv`, `results/evaluation/paired_comparison.csv`, evaluation figure(s).

- [x] Export descriptions and use only same-club attended history strictly before each event cutoff, restricted to chronological fit events.
- [x] Add `ablation_no_embeddings` with identical selected strategy, fairness, and diversity settings; no generator or weight tuning was performed.
- [x] Record per-seed ablation metrics and paired 95% t intervals.
- [x] Prespecify mean satisfaction and report its delta/CI/significance; produce metric-level deltas in `embedding_ablation.csv` and explicitly identify nonsignificant outcomes.
- [x] Test strict cutoff behavior (equal-time and future attended events do not enter the profile) and paired CI output.
- [x] Run the five-seed evaluation twice and inspect artifacts; metrics, summary, paired comparisons, ablation CSV, and report are byte-identical. Primary predicted mean-satisfaction delta is +0.097 (95% CI [+0.093, +0.101]); event-type hit-rate delta is not significant (+0.032, 95% CI [-0.079, +0.143]); Brier score worsens (+0.025, 95% CI [+0.016, +0.033]). Synthetic-only evidence caveat is explicit.

### Task 7: Final hardening, documentation, and completion

**Files:** `README.md`, `DEPENDENCIES.md`, `backend/models/README.md`, `PLAN.md`, `backend/tests/`, `results/evaluation/REPORT.md`, `results/evaluation/metrics_by_seed.csv`, `results/evaluation/summary_95ci.csv`, `results/evaluation/paired_comparison.csv`, and `results/evaluation/figures/evaluation_metrics.png`.

- [x] Extend the hardening scanner for runtime model-host references; retain CDN, external URL, Supabase, unsafe HTML, and CSP checks.
- [x] Keep suite-wide DNS/TCP/UDP blocking and prove model load/encode under the guard; no Ollama exception was added.
- [x] Verify repeated model/cache behavior and byte-identical five-seed evaluation artifacts.
- [x] Update README methodology, architecture, feature flag, license/model size, measured benchmark, and actual ablation outcome with synthetic-data caveat.
- [x] Pin and justify every added Python package and record verification evidence in root PLAN.md.
- [x] Run final available verification: Python suite (56 passed), hardening, pip check, npm verify, npm build, diff check, deterministic seed command, benchmark, and five-seed evaluation. GNU Make is unavailable on this Windows host.
- [ ] Re-run a genuinely fresh offline dependency setup against the new ML pins; the current host has no Linux/WSL or GNU Make, and pip cache inspection does not establish fresh-environment offline availability.
- [ ] Review the final diff and commit after all checks; Linux install remains unverified because WSL is not installed.

## Self-Review

- Spec coverage: E1 descriptions/schema/cache/profile/scoring and E2 temporal ablation/report/README have explicit tasks. E3 is intentionally absent as approved. Hard constraints and final local-only proof have explicit checks.
- Interfaces: cache API returns text-keyed NumPy vectors; profile assembly outputs `ContentSignal` by member; pure scorer accepts those signals; application/evaluation code owns database and model calls.
- Leakage: candidate scoring uses only prior attended descriptions; evaluation profiles use strict timestamp cutoffs and fit data; latent generator fields are excluded from description construction.
- Significance: primary mean-satisfaction endpoint is selected before examining the new results, with paired deltas and 95% CI; report wording is conditional on computed interval.
- No placeholder steps: each task names concrete files, behaviors, and runnable tests/commands. Dependency/model exact pins are selected and verified at Task 1 before code depends on them.
