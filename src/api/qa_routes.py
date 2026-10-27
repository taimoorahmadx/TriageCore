"""HTTP routes for the real QA pipeline (engine + browser evidence), mounted in src/api/app.py.

GET  /api/qa/status              engine + Groq readiness
GET  /api/qa/engine              QA weights and decision thresholds
GET  /api/qa/scenarios           scenario catalogue (pages, steps, ground truth)
POST /api/qa/run                 run one scenario live in Chromium, decide every step
POST /api/qa/evaluate            run the whole suite and compare three decision policies
GET  /api/qa/evaluation/latest   most recent saved evaluation

Handlers are plain ``def`` (not async): FastAPI runs them in a worker thread, which
Playwright's synchronous API requires.
"""

from __future__ import annotations

import json
import os
from typing import Any

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from src.agents.qa_pipeline import load_scenarios, run_scenarios
from src.core.engine import ConfidenceEngine
from src.core.weights import implied_threshold
from src.db.store import default_store
from src.eval.evaluate import RESULTS_DIR, evaluate

router = APIRouter(prefix="/api/qa", tags=["qa"])
_engine: ConfidenceEngine | None = None
_engine_error: str | None = None


def get_engine() -> ConfidenceEngine:
    """Load once; if weights.yaml is invalid, every request reports why instead of guessing."""
    global _engine, _engine_error
    if _engine is None and _engine_error is None:
        try:
            _engine = ConfidenceEngine()
        except RuntimeError as exc:
            _engine_error = str(exc)
    if _engine is None:
        raise HTTPException(status_code=500, detail=f"ConfidenceEngine unavailable: {_engine_error}")
    return _engine


@router.get("/status")
def status() -> dict[str, Any]:
    load_dotenv()
    try:
        get_engine()
        engine_ok, engine_error = True, None
    except HTTPException as exc:
        engine_ok, engine_error = False, exc.detail
    return {
        "engine_ready": engine_ok,
        "engine_error": engine_error,
        "groq_configured": bool(os.environ.get("GROQ_API_KEY")),
    }


@router.get("/engine")
def engine_summary() -> dict[str, Any]:
    spec = get_engine().weights.domain("qa")
    return {
        "causes": list(spec.hypotheses),
        "priors": spec.priors,
        "groups": {name: {"states": list(g.states), "likelihoods": g.likelihoods} for name, g in spec.groups.items()},
        "actions": {a: sorted(c) for a, c in spec.correct_under.items()},
        "loss": spec.loss,
        "thresholds": {
            tier: {a: implied_threshold(spec, tier, a) for a in spec.autonomous_actions} for tier in spec.loss
        },
        "unknown_pattern_floor": spec.unknown_pattern_floor,
    }


@router.get("/scenarios")
def scenarios() -> list[dict[str, Any]]:
    return [
        {
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "page": s.page,
            "steps": [
                {
                    "id": spec.id,
                    "name": spec.name,
                    "original_selector": spec.original_selector,
                    "risk_tier": spec.risk_tier,
                    "truth": {"cause": truth.cause, "acceptable": list(truth.acceptable)},
                }
                for spec, truth in s.steps
            ],
        }
        for s in load_scenarios()
    ]


class RunRequest(BaseModel):
    scenario_id: str
    headless: bool = True


@router.post("/run")
def run(req: RunRequest) -> dict[str, Any]:
    try:
        return run_scenarios(
            [req.scenario_id], engine=get_engine(), headless=req.headless, store=default_store()
        )[0]
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/decisions")
def decisions(limit: int = Query(default=50, ge=1, le=500)) -> list[dict]:
    return default_store().list_decisions(limit, "qa")


@router.post("/evaluate")
def run_evaluation() -> dict[str, Any]:
    get_engine()
    report = evaluate(save=True)
    report.pop("runs", None)  # full browser traces stay on disk; the summary and rows are enough here
    return report


@router.get("/evaluation/latest")
def latest_evaluation() -> dict[str, Any]:
    path = RESULTS_DIR / "qa_eval_latest.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="No evaluation has been run yet.")
    report = json.loads(path.read_text(encoding="utf-8"))
    report.pop("runs", None)
    return report
