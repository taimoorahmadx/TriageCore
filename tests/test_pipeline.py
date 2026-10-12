"""End-to-end: real pages + real browser + REAL weights.yaml, with known renames standing in
for Groq, so the decision logic is tested deterministically on genuine browser evidence.

The live demo uses GroqRelocator instead; then the LLM's proposals add real-world variance.
"""

import pytest

from src.browser.relocator import RelocationRequest
from src.eval.evaluate import evaluate


class KnownRenames:
    """Test stand-in for the LLM: the renames each dummy page actually made."""

    RENAMES = {
        "#add-to-cart-btn": "#btn-add-cart-primary",
        "#apply-promo": "#btn-apply-coupon",
        "#submit-order": "#btn-checkout-pay",
        "#add-to-cart": "#btn-add-item-primary",
    }

    def relocate(self, request: RelocationRequest) -> str:
        if "Monitor Arm" in request.html:
            return ".add-btn"  # the ambiguous page: a plausible LLM answer that matches both products
        return self.RENAMES[request.original_selector]


@pytest.fixture(scope="module")
def report():
    return evaluate(relocator=KnownRenames(), save=False)


def test_triagecore_masks_no_regressions(report):
    s = report["summary"]["triagecore"]
    assert s["regressions_total"] == 4
    assert s["masked_regressions"] == 0


def test_blind_healing_masks_every_regression(report):
    s = report["summary"]["blind_heal"]
    assert s["masked_regressions"] == s["regressions_total"]


def test_triagecore_beats_both_baselines(report):
    s = report["summary"]
    assert s["triagecore"]["accuracy"] > s["blind_heal"]["accuracy"]
    assert s["triagecore"]["accuracy"] >= s["penalty_rule"]["accuracy"]


def test_every_step_is_triaged_and_decided(report):
    assert len(report["rows"]) == 12
    for row in report["rows"]:
        assert row["triagecore_action"] in {"heal", "flag", "escalate"}
