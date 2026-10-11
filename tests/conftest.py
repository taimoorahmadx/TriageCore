from pathlib import Path

import pytest

from src.core.engine import ConfidenceEngine
from src.core.models import ConfidenceEngineInput

FIXTURES = Path(__file__).parent / "fixtures"
SYNTHETIC_WEIGHTS = FIXTURES / "weights_synthetic.yaml"


@pytest.fixture
def engine() -> ConfidenceEngine:
    return ConfidenceEngine(SYNTHETIC_WEIGHTS)


def qa_evidence(risk_tier: str = "low", **signals) -> ConfidenceEngineInput:
    """A healed QA step with one uniquely-matching relocated element, unless overridden."""
    raw = {"selector_healed": True, "relocated_match_count": 1, **signals}
    return ConfidenceEngineInput(
        evidence_type="playwright_step",
        source="qa",
        raw_signals=raw,
        context={"risk_tier": risk_tier},
    )
