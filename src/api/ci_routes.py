"""HTTP routes for fixture CI runs and the latest preliminary evaluation."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.agents.ci_pipeline import load_cases, run_cases
from src.api.qa_routes import get_engine
from src.ci.facts import GroqFactExtractor
from src.db.store import default_store
from src.eval.evaluate_ci import RESULTS_DIR

router = APIRouter(prefix="/api/ci", tags=["ci"])


@router.get("/cases")
def cases() -> list[dict[str, Any]]:
    return [
        {"id": case["id"], "repo": case.get("repo"), "run_id": case.get("run_id"), "label": case.get("label")}
        for case in load_cases()
    ]


class RunRequest(BaseModel):
    case_id: str


@router.post("/run")
def run(req: RunRequest) -> dict[str, Any]:
    try:
        return run_cases([req.case_id], engine=get_engine(), extractor=GroqFactExtractor(), store=default_store())[0]
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/evaluation/latest")
def latest_evaluation() -> dict[str, Any]:
    path = RESULTS_DIR / "ci_eval_latest.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="No CI evaluation has been run yet.")
    report = json.loads(path.read_text(encoding="utf-8"))
    report.pop("runs", None)
    return report
