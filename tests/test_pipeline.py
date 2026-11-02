"""End-to-end: real pages + real browser + REAL weights.yaml, with known renames standing in
for Groq, so the decision logic is tested deterministically on genuine browser evidence.

The live demo uses GroqRelocator instead; then the LLM's proposals add real-world variance.
"""

import pytest

from src.agents.qa_pipeline import run_scenarios
from src.browser.relocator import RelocationRequest
from src.eval.evaluate import evaluate
from src.eval.llm_judge import FixedJudge

ORIGINAL_REGRESSION_SCENARIOS = {
    "shopflow_checkout",
    "lab_rename_crash",
    "lab_error_banner",
    "lab_silent_noop",
}


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
    labeled_regressions = sum(
        row["truth_cause"] == "likely_regression" for row in report["rows"]
    )
    assert s["regressions_total"] == labeled_regressions
    assert s["masked_regressions"] == 0


def test_blind_healing_masks_every_regression(report):
    original_regressions = [
        row for row in report["rows"]
        if row["scenario"] in ORIGINAL_REGRESSION_SCENARIOS
        and row["truth_cause"] == "likely_regression"
    ]
    assert len(original_regressions) == 4
    assert all(row["blind_heal_masked"] for row in original_regressions)


def test_triagecore_beats_both_baselines(report):
    s = report["summary"]
    assert s["triagecore"]["accuracy"] > s["blind_heal"]["accuracy"]
    assert s["triagecore"]["accuracy"] >= s["penalty_rule"]["accuracy"]


def test_simple_rule_is_reported(report):
    assert "simple_rule" in report["summary"]


def test_llm_judge_baseline_is_reported():
    judge_report = evaluate(relocator=KnownRenames(), save=False, judge=FixedJudge("heal"))
    assert "llm_judge" in judge_report["summary"]
    original_regressions = [
        row for row in judge_report["rows"]
        if row["scenario"] in ORIGINAL_REGRESSION_SCENARIOS
        and row["truth_cause"] == "likely_regression"
    ]
    assert len(original_regressions) == 4
    assert all(row["llm_judge_masked"] for row in original_regressions)


def test_every_step_is_triaged_and_decided(report):
    failed_steps = sum(
        step["status"] != "passed"
        for run in report["runs"]
        for step in run["steps"]
    )
    assert len(report["rows"]) == failed_steps
    for row in report["rows"]:
        assert row["triagecore_action"] in {"heal", "flag", "escalate"}


def test_step_error_escalates():
    class Boom:
        def relocate(self, request: RelocationRequest) -> str:
            raise ZeroDivisionError("relocation failed")

    results = run_scenarios(["shopflow_checkout"], relocator=Boom())
    failed_steps = [step for step in results[0]["steps"] if step["status"] == "error"]
    assert failed_steps
    assert all(step["fail_safe_action"] == "escalate" for step in failed_steps)
    assert failed_steps[0]["error"] == "ZeroDivisionError: relocation failed"
    assert all(
        step["error"] == "skipped: an earlier step failed"
        for step in failed_steps[1:]
    )

    report = evaluate(relocator=Boom(), save=False)
    error_rows = [row for row in report["rows"] if row["triagecore_cause"] == "error"]
    assert error_rows
    assert all(row["triagecore_action"] == "escalate" for row in error_rows)
    assert all(row["confidence"] is None for row in error_rows)
