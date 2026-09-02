from pydantic import BaseModel, Field
from typing import Literal, Dict, Any, Optional

class ConfidenceEngineInput(BaseModel):
    evidence_type: str = Field(description="The type of evidence being analyzed.")
    source: Literal["qa", "ci"] = Field(description="The source of the evidence: qa (browser) or ci (logs).")
    raw_signals: Dict[str, Any] = Field(description="Extracted data points to be weighted.")
    context: Dict[str, Any] = Field(description="Additional context for the decision (e.g., truncated flags).")

class ConfidenceEngineOutput(BaseModel):
    classification: Literal["flaky", "dependency", "bug", "infra", "stale_selector", "likely_regression"] = Field(description="Diagnosis only. Never an action.")
    confidence_score: int = Field(ge=0, le=100, description="Calculated confidence score between 0 and 100.")
    reasoning_trace: str = Field(description="Explanation of how the score was calculated.")
    recommended_action: Literal["heal", "escalate", "auto-fix", "flag"] = Field(description="The action derived from comparing the confidence score to the threshold.")
