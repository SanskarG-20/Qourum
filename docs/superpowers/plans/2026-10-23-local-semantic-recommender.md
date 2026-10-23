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

- [ ] Confirm a compatible Python 3.11 CPU-only Torch and sentence-transformers version pair on Windows and Linux; pin every newly introduced direct/transitive package and document each direct addition in one line.
- [ ] Download the selected model at a fixed immutable revision. Vendor only `model.safetensors`, model/tokenizer configs, tokenizer vocabulary/data, `modules.json`, and pooling config needed by sentence-transformers; do not include duplicate `.bin`, TensorFlow, Rust, OpenVINO, or ONNX exports.
- [ ] Record the upstream model ID, revision SHA, Apache-2.0 attribution, included file list, and each included file's SHA-256 in `backend/models/README.md`.
- [ ] Add a test loading the vendored absolute directory path with `local_files_only=True`, `trust_remote_code=False`, and CPU device; encode the same short text twice and assert shape `(1, 384)`, finite normalized output, and equality within a strict tolerance.
- [ ] Run the new model smoke test with DNS/TCP/UDP network guards active. Verify missing model files raise a local error rather than triggering a download.
- [ ] Run `py -3.11 -m pytest backend/tests/test_embedding_service.py -q` and `py -3.11 -m pip check`.

### Task 2: Add seeded, non-latent event descriptions

**Files:** `backend/synthetic_data/models.py`, `backend/synthetic_data/generator.py`, `backend/synthetic_data/exporter.py`, `backend/tests/test_synthetic_data.py`, `backend/tests/test_data_layer.py`.

- [ ] Add `description: str` to the synthetic event record. Keep existing `SyntheticEventType.description` as the event-type description field.
- [ ] Replace category/latent-correlated event-type description literals with a small fixed set of varied grammatical templates and shared vocabulary. Select description variations only from generator RNG state and event identity/order, never from `latent_attributes`, `latent_persona`, club persona distributions, activity tier, or generated attendance outcomes.
- [ ] Generate event descriptions using a seeded template with overlapping terms across event types, based only on public event-type description/name plus fixed generic topic/activity phrase lists; make multiple events of one type vary deterministically.
- [ ] Export the event description column and continue `_validate_clean_columns` checks for latent field leakage.
- [ ] Add tests that two same-seed dataset generations produce identical descriptions and a different seed changes at least some variation; AST/spy tests assert the description generator does not access latent fields; check shared vocabulary exists across event types.
- [ ] Run `py -3.11 -m pytest backend/tests/test_synthetic_data.py backend/tests/test_data_layer.py -q` and `py -3.11 -m app.seed --seed 42`.

### Task 3: Persist descriptions and SQLite embedding cache

**Files:** `backend/app/models.py`, `backend/app/database.py`, `backend/app/seed.py`, `backend/app/event_workflow.py`, `backend/tests/test_data_layer.py`, `backend/tests/test_event_workflow.py`.

- [ ] Add non-null text description to `Event` with a backwards-compatible SQL default. `EventType.description` already exists and is populated from the generator.
- [ ] Add an `EmbeddingCache` model with composite identity `(text_sha256, model_revision)`, binary float32 vector, dimension, and creation timestamp. Add constraints for a 64-character lowercase SHA-256 key and positive dimension.
- [ ] Add idempotent SQLite schema upgrade logic that adds `events.description` to an existing P0–P12 database and creates the cache table without dropping user data. New databases use normal metadata creation. Existing empty descriptions receive the related event-type description during migration/backfill.
- [ ] Persist exported synthetic event descriptions through `seed_database`. Accepted scheduled events use the type description by default; response JSON returns the stored event description.
- [ ] Test deterministic rebuild equality, old-schema upgrade and idempotence, cache uniqueness/FK constraints if any, and API event-description round-trip.
- [ ] Run the focused data/event tests and full existing suite before proceeding.

### Task 4: Implement pure content scoring and SQLite-backed feature assembly

**Files:** `backend/recsys/config.py`, `backend/recsys/individual.py`, `backend/app/embedding_service.py`, `backend/app/recommendations.py`, `backend/tests/test_individual_scoring.py`, `backend/tests/test_embedding_service.py`, `backend/tests/test_recommendation_api.py`.

- [ ] Add config constants for embedding enablement, content base weight, confidence prior, and half-life. Define the default as enabled; allow explicit disable by local setting. Preserve other component relative weights, then normalize all evidence weights in one step.
- [ ] Add frozen `ContentSignal(similarity, observation_count)` and `content_similarity`/confidence fields to score evidence. Extend `score_members` with optional mapping and enable flag; when omitted/disabled, its current result and component breakdown remain unchanged.
- [ ] In `embedding_service.py`, lazily instantiate the CPU sentence-transformer from the resolved repo-local path with `local_files_only=True`, `trust_remote_code=False`, and fixed encode options. Do not set any model cache path outside the repo and do not use hub helpers.
- [ ] Normalize whitespace in text before SHA-256 hashing. Include model revision in the unique cache key. Query cached vectors, batch-encode only cache misses, validate dimension/finite float32 values, persist them, and return stable vector mappings.
- [ ] Build each member profile from attended event descriptions with `event.start_time < cutoff`; apply exponential half-life weights; divide by sum of weights. Compare only against the event-type candidate description, map cosine to `[0,1]`, and include the number of attended descriptions in `ContentSignal`. No profile yields no content signal.
- [ ] Add tests for cache hits (encoder called once), key changes for changed text/revision, vector integrity, deterministic profile similarity, cold-start candidate type with existing member profile, no-attendance member behavior, and cutoff exclusion of equal/future events.
- [ ] Add scorer unit tests for boundedness, determinism, no-content parity, isolated similarity monotonicity, content confidence, and unchanged explicit/attendance/time monotonicity.
- [ ] Run pure scorer tests and embedding integration tests while the outbound DNS/socket blocker is active.

### Task 5: Integrate event workflow and deterministic evidence

**Files:** `backend/app/recommendations.py`, `backend/app/event_workflow.py`, `backend/recsys/explanations.py`, `backend/tests/test_recommendation_api.py`, `backend/tests/test_explanations.py`, `backend/tests/test_event_workflow.py`.

- [ ] Build one content-evidence map per candidate from the current club's event history and pass it into `score_members`; do not put ORM queries or model objects inside `backend/recsys`.
- [ ] Honor the local config switch: disabled means no model import/load/cache read and exact old non-content scores; enabled uses only local vendored model and SQLite cache.
- [ ] Retain content similarity in structured component evidence. If content is the highest positive evidence, deterministic explanation templates may describe semantic alignment; only render numeric values present in that evidence object.
- [ ] Ensure accepted event description, member event list, and all relevant API tests use the persisted safe text field; keep React escaped text rendering.
- [ ] Test organizer/member authorization and CSRF behavior unchanged, plus the feature flag path and explanation numeric evidence consistency.
- [ ] Run recommendation API, explanation, event workflow, and full suite tests.

### Task 6: Add leakage-safe temporal ablation and confidence report

**Files:** `backend/evaluation/runner.py`, `backend/tests/test_evaluation.py`, `results/evaluation/REPORT.md`, `results/evaluation/metrics_by_seed.csv`, `results/evaluation/summary_95ci.csv`, `results/evaluation/paired_comparison.csv`, evaluation figure(s).

- [ ] Pass event descriptions through the synthetic export and evaluation contexts. For each event under test, create profiles using only attended event descriptions with timestamps strictly less than the event timestamp, drawn from the chronological fit set.
- [ ] Add `ablation_no_embeddings` as the same validation-selected strategy, fairness, and diversity configuration with only the content feature switched off. Do not tune the content weight or modify data generation on test results.
- [ ] Record per-seed metric rows for the ablation and compare `main_model - ablation_no_embeddings` with paired two-sided 95% t intervals across all seeds.
- [ ] Select `mean_satisfaction` as the prespecified primary content endpoint. Render its mean paired delta, CI, and significance status in the generated report; render metric-level paired delta/CI rows in a generated ablation CSV/table. Explicitly say “not statistically significant”/“inconclusive” when the CI includes zero.
- [ ] Add an evaluation test that held-out event description/outcome changes do not change the profile for an earlier cutoff and that all per-seed ablation outputs have the expected methods/metrics and CI bounds.
- [ ] Run `cd backend; py -3.11 -m evaluation.runner --seeds 42 43 44 45 46 --output ../results/evaluation`; inspect report and CSVs directly. Do not label synthetic gains real-world evidence.

### Task 7: Final hardening, documentation, and completion

**Files:** `README.md`, `DEPENDENCIES.md`, `backend/models/README.md`, `PLAN.md`, `backend/tests/`, `results/evaluation/REPORT.md`, `results/evaluation/metrics_by_seed.csv`, `results/evaluation/summary_95ci.csv`, `results/evaluation/paired_comparison.csv`, and `results/evaluation/figures/evaluation_metrics.png`.

- [ ] Extend `tools/hardening_check.py` to reject any runtime Hub hostname/client/reference, and retain no-external-URL/CDN checks. Vendored model metadata documents provenance but application Python must never reference a remote model ID at load time.
- [ ] Keep the suite-wide DNS/TCP/UDP blocker active and add an explicit test proving model encode passes with it enabled. Do not open a loopback exception for the deferred Ollama feature.
- [ ] Check deterministic model/cache results in repeated same-seed runs; run the five-seed evaluation twice and confirm the generated per-seed metrics and summary CSVs are byte-identical.
- [ ] Update README math and architecture for content profiles/cache, flag setting, model license/size, exact setup weight, and evaluation result. State that any gains on synthetic data are weak evidence; if mean satisfaction CI includes zero, say content lift is not statistically significant/inconclusive.
- [ ] Update `DEPENDENCIES.md` with one-line justification for each newly added package and `PLAN.md` with phase/task verification evidence.
- [ ] Run full verification: `py -3.11 -m pytest backend/tests -q`, `py -3.11 tools/hardening_check.py`, `py -3.11 -m pip check`, `npm run verify`, `npm run build`, `git diff --check`, deterministic seed generation, and the five-seed evaluation.
- [ ] Perform a fresh local-clone offline setup (`npm ci --offline`; `PIP_NO_INDEX=1 py -3.11 -m pip install --no-index -r requirements.txt`), seed, and API/Vite smoke run. On a host with GNU Make, also run the documented `make setup && make seed && make dev` acceptance sequence.
- [ ] Review the complete git diff for latent leakage, runtime network calls, held-out data leakage, false significance claims, and weight provenance; commit all implementation, tests, evaluation artifacts, and documentation together.

## Self-Review

- Spec coverage: E1 descriptions/schema/cache/profile/scoring and E2 temporal ablation/report/README have explicit tasks. E3 is intentionally absent as approved. Hard constraints and final local-only proof have explicit checks.
- Interfaces: cache API returns text-keyed NumPy vectors; profile assembly outputs `ContentSignal` by member; pure scorer accepts those signals; application/evaluation code owns database and model calls.
- Leakage: candidate scoring uses only prior attended descriptions; evaluation profiles use strict timestamp cutoffs and fit data; latent generator fields are excluded from description construction.
- Significance: primary mean-satisfaction endpoint is selected before examining the new results, with paired deltas and 95% CI; report wording is conditional on computed interval.
- No placeholder steps: each task names concrete files, behaviors, and runnable tests/commands. Dependency/model exact pins are selected and verified at Task 1 before code depends on them.
