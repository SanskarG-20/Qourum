# Vendored sentence embedding model

- Model: `sentence-transformers/all-MiniLM-L6-v2`
- Revision: `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`
- License: Apache-2.0
- Runtime: CPU, 384-dimensional sentence embeddings; application loads this directory with `local_files_only=True`.
- Storage: committed directly in git (`model.safetensors` is ~87 MiB), not Git LFS. Converting an already-public repo to LFS rewrites every commit hash and breaks existing clones/forks/PRs, so that migration needs the repository owner's explicit sign-off rather than being done unilaterally. If storage becomes a problem, migrate with `git lfs migrate import --include="*.safetensors"` and coordinate the force-push with everyone holding a clone.
- Provenance: model and tokenizer files are vendored so inference does not download files or contact a model host.

SHA-256 checksums:

| File | Bytes | SHA-256 |
|---|---:|---|
| `1_Pooling/config.json` | 190 | `4BE450DDE3B0273BB9787637CFBD28FE04A7BA6AB9D36AC48E92B11E350FFC23` |
| `config.json` | 612 | `953F9C0D463486B10A6871CC2FD59F223B2C70184F49815E7EFBCAB5D8908B41` |
| `config_sentence_transformers.json` | 116 | `061CA9D39661D6C6D6DE5BA27F79A1CD5770EA247F8D46412A68A498DC5AC9F3` |
| `model.safetensors` | 90868376 | `53AA51172D142C89D9012CCE15AE4D6CC0CA6895895114379CACB4FAB128D9DB` |
| `modules.json` | 349 | `84E40C8E006C9B1D6C122E02CBA9B02458120B5FB0C87B746C41E0207CF642CF` |
| `sentence_bert_config.json` | 53 | `FC1993FDE0A95C24EC6C022539D41CF6E2F7C9721E5415D6FB6897472A9CD4B7` |
| `special_tokens_map.json` | 112 | `303DF45A03609E4EAD04BC3DC1536D0AB19B5358DB685B6F3DA123D05EC200E3` |
| `tokenizer.json` | 466247 | `BE50C3628F2BF5BB5E3A7F17B1F74611B2561A3A27EEAB05E5AA30F411572037` |
| `tokenizer_config.json` | 350 | `ACB92769E8195AABD29B7B2137A9E6D6E25C476A4F15AA4355C233426C61576B` |
| `vocab.txt` | 231508 | `07ECED375CEC144D27C900241F3E339478DEC958F92FDDBC551F295C992038A3` |
