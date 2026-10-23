"""Local FastAPI entry point serving the built single-origin application."""

import mimetypes
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import create_database_engine, database_path, initialize_schema
from .seed import seed_database
from .auth import router as auth_router
from .clubs import router as clubs_router
from .recommendation_api import router as recommendations_router
from .feedback import router as feedback_router
from .event_workflow import router as event_workflow_router

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DIST_DIRECTORY = REPOSITORY_ROOT / "dist"
ASSETS_DIRECTORY = DIST_DIRECTORY / "assets"
INDEX_FILE = DIST_DIRECTORY / "index.html"
mimetypes.add_type("font/woff", ".woff")
mimetypes.add_type("font/woff2", ".woff2")

@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Create and deterministically seed the configured database when absent."""
    selected_database = database_path()
    if not selected_database.is_file():
        seed_database(db_path=selected_database)
    engine = create_database_engine(selected_database)
    initialize_schema(engine)
    engine.dispose()
    yield


app = FastAPI(title="Quorum", docs_url=None, redoc_url=None, lifespan=lifespan)
app.include_router(auth_router)
app.include_router(clubs_router)
app.include_router(recommendations_router)
app.include_router(feedback_router)
app.include_router(event_workflow_router)
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
