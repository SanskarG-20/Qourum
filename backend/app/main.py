"""Local FastAPI entry point serving the built single-origin application."""

import mimetypes
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DIST_DIRECTORY = REPOSITORY_ROOT / "dist"
ASSETS_DIRECTORY = DIST_DIRECTORY / "assets"
INDEX_FILE = DIST_DIRECTORY / "index.html"
mimetypes.add_type("font/woff", ".woff")
mimetypes.add_type("font/woff2", ".woff2")

app = FastAPI(title="Quorum", docs_url=None, redoc_url=None)
app.mount(
    "/assets",
    StaticFiles(directory=ASSETS_DIRECTORY, check_dir=False),
    name="assets",
)


@app.get("/api/health")
def health() -> dict[str, str]:
    """Report that the local Quorum HTTP service is responding."""
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def frontend_root() -> FileResponse:
    """Serve the built React application at the site root."""
    if not INDEX_FILE.is_file():
        raise HTTPException(status_code=503, detail="Frontend build is missing; run `make build`.")
    return FileResponse(INDEX_FILE)


@app.get("/{requested_path:path}", include_in_schema=False)
def frontend_route(requested_path: str) -> FileResponse:
    """Serve a built file or fall back to the SPA entry point for client routes."""
    if requested_path == "api" or requested_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found.")
    if not INDEX_FILE.is_file():
        raise HTTPException(status_code=503, detail="Frontend build is missing; run `make build`.")

    resolved_dist = DIST_DIRECTORY.resolve()
    requested_file = (DIST_DIRECTORY / requested_path).resolve()
    if not requested_file.is_relative_to(resolved_dist):
        raise HTTPException(status_code=404, detail="File not found.")
    if requested_file.is_file():
        return FileResponse(requested_file)
    return FileResponse(INDEX_FILE)
