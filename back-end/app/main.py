"""Primary FastAPI application entry point."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api.router import router
from api.v1.crud_tester import router as crud_tester_router


app = FastAPI()
app.include_router(router, prefix="/api/v1")
app.include_router(crud_tester_router)

REPOSITORY_DIRECTORY = Path(__file__).resolve().parents[2]
CRUD_TESTER_DIRECTORY = REPOSITORY_DIRECTORY / "front-end"
app.mount(
    "/crud-tester",
    StaticFiles(directory=CRUD_TESTER_DIRECTORY, html=True),
    name="crud-tester",
)