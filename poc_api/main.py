import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError
from typing import Literal, Optional

# Ensure root workspace is on python path for importing poc_recovery
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from poc_recovery import run_scenario

app = FastAPI(
    title="TriageCore POC Live Detection API",
    description="Throwaway local API wrapping Playwright + Groq LLM detection for live demo defense.",
    version="0.1.0"
)

# Enable CORS for frontend running locally on Vite / dev ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

dummy_dir = ROOT_DIR / "tests" / "dummy"
if dummy_dir.exists():
    app.mount("/tests/dummy", StaticFiles(directory=str(dummy_dir)), name="dummy")

class ScenarioRequest(BaseModel):
    scenario: Literal["control", "trap"] = Field(
        ..., description="The scenario to evaluate: 'control' (safe heal) or 'trap' (masked regression)"
    )

class ScenarioResponse(BaseModel):
    scenario: Literal["control", "trap"]
    classification: Literal["stale_selector", "likely_regression", "SAFE_HEAL", "MASKED_REGRESSION_ESCALATED"]
    confidence_score: int = Field(ge=0, le=100)
    reasoning_trace: str
    recommended_action: Literal["heal", "escalate"]
    duration_ms: int
    poc_verdict: Optional[Literal["SAFE_HEAL", "MASKED_REGRESSION_ESCALATED"]] = None

class CiTriageRequest(BaseModel):
    scenario: Literal["flaky", "bug", "ambiguous"] = Field(
        default="bug", description="CI failure scenario to triage: flaky, bug, or ambiguous"
    )
    repo: Optional[str] = Field(default="taimoorahmadx/TriageCore")
    workflow: Optional[str] = Field(default="ci.yml")
    run_id: Optional[str] = Field(default="#1043")

class CiTriageResponse(BaseModel):
    scenario: Literal["flaky", "bug", "ambiguous"]
    classification: Literal["flaky", "dependency", "bug", "infra"]
    confidence_score: int = Field(ge=0, le=100)
    recommended_action: Literal["rerun", "auto-fix", "escalate", "flag"]
    reasoning_trace: str
    attributed_commit: Optional[str] = None
    author: Optional[str] = None
    failure_signal: str
    draft_pr: Optional[dict] = None
    duration_ms: int = 420

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "triagecore-poc-api"}

@app.post("/api/poc/run", response_model=ScenarioResponse)
def run_poc_scenario(payload: ScenarioRequest):
    try:
        # Run headless=True so execution is fast and robust in API context
        result = run_scenario(payload.scenario, headless=True)
        return ScenarioResponse.model_validate(result)
    except ValidationError as e:
        raise HTTPException(status_code=502, detail=f"POC returned invalid payload: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"POC execution error: {str(e)}")

@app.post("/api/ci/triage", response_model=CiTriageResponse)
def run_ci_triage(payload: CiTriageRequest):
    try:
        if payload.scenario == "flaky":
            return CiTriageResponse(
                scenario="flaky",
                classification="flaky",
                confidence_score=92,
                recommended_action="rerun",
                reasoning_trace="Log analysis isolated a transient Redis socket timeout. Git diff reveals no modifications to database, cache, or network configuration. Historical run log indicates a 90% pass rate on identical commit SHA. Confidence exceeds threshold (92% >= 85%); safe for autonomous pipeline rerun.",
                attributed_commit="None (Infrastructure Timeout)",
                author="devops@triagecore.internal",
                failure_signal="redis.exceptions.ConnectionError · 9/10 Past Passes",
                draft_pr=None,
                duration_ms=380
            )
        elif payload.scenario == "bug":
            return CiTriageResponse(
                scenario="bug",
                classification="bug",
                confidence_score=96,
                recommended_action="auto-fix",
                reasoning_trace="Failed pytest assertion 'psycopg2.errors.SyntaxError: syntax error at or near \",\" at line 42' matches AST of commit 4a8f9b ('feat: add org-level migrations'). Single author, isolated regression with 100% reproduction rate. Proposing draft fix PR; autonomous merge prohibited per safety constraint.",
                attributed_commit="4a8f9b (feat: add org-level migrations)",
                author="alice@triagecore.internal",
                failure_signal="psycopg2.errors.SyntaxError · 100% Repro on Commit 4a8f9b",
                draft_pr={
                    "number": 142,
                    "title": "fix(db): correct trailing comma syntax in db/migrations/004.sql",
                    "branch": "triagecore/autofix-4a8f9b-migration-syntax",
                    "diff": "- CREATE INDEX idx_org_users ON users (org_id,, created_at);\n+ CREATE INDEX idx_org_users ON users (org_id, created_at);",
                    "safety_notice": "Safety Rule: CI Agent is restricted to proposing draft PRs. Autonomous merging is strictly forbidden."
                },
                duration_ms=450
            )
        else:
            # Ambiguous commits scenario
            return CiTriageResponse(
                scenario="ambiguous",
                classification="bug",
                confidence_score=15,
                recommended_action="escalate",
                reasoning_trace="AttributeError: 'TenantContext' object has no attribute 'schema_name'. Git commit history shows 2 authors modified core/tenant_context.py within 45 minutes (commits 7c1a2e and 9b4f02). Rule violation: ambiguous_commit=true flagged. Confidence mathematically suppressed to 15% (< 85% threshold) to prevent hallucinated automated patch. Escalating to engineering team with unified blame diff.",
                attributed_commit="Ambiguous: 7c1a2e (alice@) & 9b4f02 (bob@)",
                author="Multiple Authors (Conflict)",
                failure_signal="ambiguous_commit=true · 2 Overlapping Diffs in last 45m",
                draft_pr=None,
                duration_ms=410
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CI triage execution error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("poc_api.main:app", host="0.0.0.0", port=8000, reload=True)

