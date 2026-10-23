# Dependency justifications

- `uvicorn`: ASGI server required to run the local FastAPI application.
- `argon2-cffi`: Argon2id password hashing required for local authentication.
- `httpx`: pinned test client transport for FastAPI authentication and authorization integration tests.
- `@fontsource/caveat`, `@fontsource/inter`, `@fontsource/jetbrains-mono`, `@fontsource/silkscreen`: build-time font assets so Vite can bundle the existing typefaces for offline runtime use.
