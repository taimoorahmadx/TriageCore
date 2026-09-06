import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal

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

class ScenarioRequest(BaseModel):
    scenario: Literal["control", "trap"] = Field(
        ..., description="The scenario to evaluate: 'control' (safe heal) or 'trap' (masked regression)"
    )

class ScenarioResponse(BaseModel):
    scenario: Literal["control", "trap"]
    classification: Literal["SAFE_HEAL", "MASKED_REGRESSION_ESCALATED"]
    confidence_score: int
    reasoning_trace: str
    recommended_action: Literal["heal", "escalate"]
    duration_ms: int

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "triagecore-poc-api"}

@app.post("/api/poc/run", response_model=ScenarioResponse)
def run_poc_scenario(payload: ScenarioRequest):
    try:
        # Run headless=True so execution is fast and robust in API context
        result = run_scenario(payload.scenario, headless=True)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"POC execution error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("poc_api.main:app", host="0.0.0.0", port=8000, reload=True)
