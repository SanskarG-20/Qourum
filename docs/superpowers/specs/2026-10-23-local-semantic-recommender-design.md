# Local Semantic Recommender Design

**Status:** Proposed for implementation review

**Goal:** Add a deterministic, local-only event-description similarity feature to Quorum and measure its incremental value without changing synthetic behavior to favor it.

**Scope:** Required E1 and E2 from the approved amendment. Optional E3 (Ollama helper) is explicitly deferred. The original project requirements in the conversation and tracked `PLAN.md` remain active, with only the stated local-ML exception to Hard Constraints 1 and 7.

## Decisions

- Use `sentence-transformers/all-MiniLM-L6-v2`, pinned by a recorded model revision and vendored in `backend/models/all-MiniLM-L6-v2/`. The model card identifies Apache-2.0, 384-dimensional sentence vectors, and the `model.safetensors` weight file at approximately 90.9 MB. Vendor only files needed for sentence-transformers and its tokenizer/pooling configuration, not alternate TensorFlow, Rust, OpenVINO, or ONNX exports. [Model card and license](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2), [model files](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/tree/main).
- Pin `sentence-transformers` and all newly required Python dependencies. Load only the vendored absolute path using `local_files_only=True`, CPU device, `trust_remote_code=False`, and evaluation mode. Sentence Transformers documents `local_files_only` as disabling model downloads. [Loading API](https://sbert.net/docs/package_reference/sentence_transformer/model.html).
- Enable embeddings by default for the recommendation scorer; provide a local configuration flag to disable the component. Runtime model loading must fail clearly if weights are missing while the feature is enabled; it must never fall back to downloading weights. With the flag disabled, the existing non-content score path remains available.
- Keep scoring pure: the embedding service loads the model, computes normalized text hashes, reads/writes vector cache entries, builds member profiles, and supplies numeric content similarities. `backend/recsys/individual.py` receives those numeric values and performs the blend without database/model I/O.
- Cache float32 sentence vectors in SQLite. Key entries by a SHA-256 of the exact normalized text and model revision, enforce uniqueness, and store a dimension/version marker so incompatible rows cannot be mistaken for valid vectors.
- Build a member profile only from descriptions of events that the member attended before the candidate's temporal cutoff. Compute a recency-weighted mean with the existing attendance half-life, then cosine similarity between that profile and the event type/candidate description. Map cosine from `[-1, 1]` to `[0, 1]` and clamp for numerical safety. No past attended events means no content evidence; current explicit/implicit/time evidence and the existing cold-start fallback continue to work.
- When the candidate event type has no event history, still compare its event-type description with member profiles. Candidate descriptions use the event type's description until an accepted event has its own description.
- Add a content base weight and confidence prior in the central recsys config. Normalize all available confidence-adjusted components exactly as the current hybrid score does. Keep the score in `[0,1]` and retain `content_similarity` in component evidence.
- Add deterministic description templates with shared vocabulary. Seeded variation is assigned independently of persona/latent fields; do not derive phrases, templates, or selection probabilities from latent persona attributes, event-type latent attributes, club persona categories, or observed evaluation outcomes. Add per-event descriptions to the generator and persisted event schema as well as retaining/expanding event-type descriptions.
- Persist the new description column and embedding-cache table with a compatible SQLite schema migration. Existing databases receive a stable default description for existing events; a missing database continues to be generated from the requested seed.

## Temporal evaluation

- Keep the chronological 70/15/15 split and validation-only tuning unchanged.
- Construct each evaluation member profile from attended events strictly earlier than the evaluated event timestamp and inside that seed's training/validation fit window. Never use the held-out target event description or its RSVP outcome to form a profile.
- Add `ablation_no_embeddings`, running the same selected aggregation strategy and fairness/diversity settings with only the content component disabled.
- Across the existing five or more fixed seeds, write per-seed ablation metrics and paired main-minus-ablation deltas with two-sided 95% confidence intervals. Use the existing t-interval method. The report and README must state whether the content gain is statistically significant for mean satisfaction and report metric-level deltas; if its CI includes zero, explicitly call the gain inconclusive/not significant. Do not modify the generator, model, weights, or thresholds in response to evaluation results.
- Explain that any measured gain on synthetic data is weak evidence and is not a claim of real-club effectiveness.

## Network and security boundary

- No runtime code calls the Hugging Face Hub, package indexes, telemetry, or external services. The model path must be local and `local_files_only=True`.
- Keep the existing DNS/TCP/UDP outbound-blocking test active across the full suite. Add a test that runs model loading/encoding with network APIs blocked and proves no network attempt occurs.
- No Ollama code, endpoint, port exception, or `connect-src` change is included because E3 is deferred. No prompt text can change scores, rankings, or feasibility.

## Data and public interfaces

- Add nullable-at-input but persisted non-null `description` fields to `SyntheticEvent`, SQLAlchemy `Event`, exports, seed flow, accepted-event creation, and event response schemas. Use a deterministic generator default when older data lacks a description.
- Extend the pure score input with per-member candidate content similarities (optional; absent means feature disabled/no profile); extend `MemberScore` with the content signal and component weight.
- Keep existing recommendation route payloads stable. Explanations may mention content only through deterministic evidence templates and only when evidence exists.
- Add `EmbeddingCache` as a SQLAlchemy model/table. Embedding cache values are implementation state, not member profile records and contain no member identifiers.

## Acceptance criteria

1. An audit of generator inputs proves the description generator does not read latent persona or event-type latent fields.
2. Same text/model revision encodes once and returns identical cached vectors; changing the text or model revision produces a different key.
3. A cold-start event type receives a content score from its description when a member has prior attended-event descriptions; a member with no attended history does not receive invented profile evidence.
4. Individual scores stay bounded, deterministic, and monotonic for the pre-existing explicit, attendance, and time tests with embeddings disabled. With embeddings enabled, adding a higher-similarity signal cannot lower the isolated content component.
5. Future events and held-out event evidence never enter a member profile.
6. Full suite including socket/DNS blocking passes with local model inference; no network exception is added.
7. The evaluation produces `ablation_no_embeddings`, paired deltas, confidence intervals, and honest generated report text; README reflects the actual outcome.
8. Offline setup, deterministic seeding, FastAPI/Vite workflow, and frontend build continue working.

## Risks and limits

- Vendored weights add roughly 91 MB to the repository, and sentence-transformers/PyTorch add substantial install size and cold-start latency. The selected model has CPU-compatible sentence-transformers loading, but the actual dependency and startup footprint must be measured before finalizing pins.
- Model inference can have small platform/library numerical differences. Pin model revision and dependencies, use CPU/eval mode, cache float32 vectors, and verify same-environment reproducibility.
- Synthetic descriptions can accidentally create a shortcut even if generated independently from latent labels. Audit template construction and report the result as a synthetic-data experiment only.
- The absent `PROMPT.md` means this design cites the conversation's original prompt and `PLAN.md` as the governing baseline.

## Self-review

- E1 is covered by descriptions, vendored local embeddings, attendee-only recency profiles, SQLite cache, deterministic score blending, cold-start event-type similarity, tests, and temporal cutoffs.
- E2 is covered by a no-embeddings ablation, five-seed paired CI, generated report, and README caveat. The generator is explicitly frozen with respect to evaluation outcomes.
- E3 is intentionally deferred because the amendment marks it optional and the approved design selected a deterministic-only path. No socket exception or nondeterministic explanation code is required.
- Only allowed hard constraints 1 and 7 are modified: local in-process embeddings are added, while all other runtime traffic remains prohibited and non-LLM template explanations remain deterministic.
- Main unresolved implementation detail is the exact compatible sentence-transformers/PyTorch dependency pin set and measured install/runtime size. This will be resolved through a pinned local smoke installation before implementation completion; it does not alter this interface or security design.
