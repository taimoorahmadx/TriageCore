"""Run: .venv/bin/python -m uvicorn src.api.app:app --port 8000"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from archive.poc.legacy_routes import router as legacy_router
from src.api.qa_routes import router as qa_router
from src.ci.webhooks import router as ci_webhook_router

REPO_ROOT = Path(__file__).resolve().parents[2]

app = FastAPI(title="TriageCore API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/tests/dummy", StaticFiles(directory=str(REPO_ROOT / "tests" / "dummy")), name="dummy")
app.include_router(qa_router)
app.include_router(ci_webhook_router)
app.include_router(legacy_router)  # scripted proposal demo; routes stay under /api/legacy/*


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "triagecore-api"}
