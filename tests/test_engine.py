"""Tests for the ConfidenceEngine (Bayesian diagnosis + minimum-expected-loss decision).

All numbers come from tests/fixtures/weights_synthetic.yaml, which are synthetic
values chosen so the arithmetic can be checked by hand. They test the engine's
mathematics and invariants, not the project's real weights.
"""

import time
from pathlib import Path

import pytest
import yaml

from src.core.engine import ConfidenceEngine
from src.core.evidence import Posterior
from src.core.models import ConfidenceEngineInput, ConfidenceEngineOutput
from src.core.weights import ACTIONS, CLASSIFICATIONS, implied_threshold, load_weights
from tests.conftest import SYNTHETIC_WEIGHTS, qa_evidence

# Evidence for a clean, successful heal: no errors, expected state reached.
CLEAN = dict(
    uncaught_page_errors=0,
    failed_requests=0,
    error_state_shown=False,
    expected_state_reached=True,
    console_errors=0,
    action_succeeded=True,
    original_resolved_after_wait=False,
)


def posterior_of(engine, evidence):
    spec = engine.weights.domain(evidence.source)
    states = engine.adapters[evidence.source].group_states(evidence.raw_signals, spec)
    return engine.model.posterior(spec, states)


# (a) The engine reproduces a posterior computed by hand.
def test_posterior_matches_hand_calculation(engine):
    # Evidence: page error + error banner (runtime_failure = "2+"), expected state NOT reached.
    # Unnormalised P(cause) * P(2+ | cause) * P(not_reached | cause):
    #   stale:      0.6 * 0.02 * 0.1 = 0.0012
    #   regression: 0.3 * 0.50 * 0.8 = 0.1200
    #   flaky:      0.1 * 0.05 * 0.5 = 0.0025      total = 0.1237
    ev = qa_evidence(uncaught_page_errors=1, error_state_shown=True, expected_state_reached=False)
    p = posterior_of(engine, ev).probs
    assert p["stale_selector"] == pytest.approx(0.0012 / 0.1237)
    assert p["likely_regression"] == pytest.approx(0.1200 / 0.1237)
    assert p["flaky"] == pytest.approx(0.0025 / 0.1237)

    out = engine.evaluate(ev)
    assert out.classification == "likely_regression"
    assert out.recommended_action == "escalate"


# (b) Missing evidence is marginalised out: it changes nothing and is never read as "fine".
def test_missing_group_leaves_posterior_unchanged(engine):
    base = qa_evidence(uncaught_page_errors=0, expected_state_reached=True)
    with_null = qa_evidence(uncaught_page_errors=0, expected_state_reached=True, console_errors=None)
    assert posterior_of(engine, base).probs == pytest.approx(posterior_of(engine, with_null).probs)

    absent = qa_evidence(uncaught_page_errors=0, expected_state_reached=True, console_errors=0)
    assert posterior_of(engine, absent).probs != pytest.approx(posterior_of(engine, base).probs)


# (c) Monotonicity: adding a failure indicator never makes "harmless rename" more likely.
def test_adding_failure_signal_never_raises_p_stale(engine):
    steps = [
        dict(CLEAN),
        {**CLEAN, "uncaught_page_errors": 1},
        {**CLEAN, "uncaught_page_errors": 1, "error_state_shown": True},
        {**CLEAN, "uncaught_page_errors": 1, "error_state_shown": True, "expected_state_reached": False},
    ]
    p_stale = [posterior_of(engine, qa_evidence(**s)).probs["stale_selector"] for s in steps]
    assert p_stale == sorted(p_stale, reverse=True)


# (d) The general loss-matrix policy reduces to the threshold tau = C_mask / (C_mask + C_escalate).
def test_policy_matches_threshold_formula(engine):
    spec = engine.weights.domain("qa")
    # Low tier: heal wrong costs 10 (masking), escalating a harmless rename costs 1 -> tau = 10/11.
    tau = implied_threshold(spec, "low", "heal")
    assert tau == pytest.approx(10 / 11)

    def decide(p_stale):
        post = Posterior(
            probs={"stale_selector": p_stale, "likely_regression": 1 - p_stale, "flaky": 0.0},
            log_likelihoods={}, observed=("x",), missing=(), fit=1.0,
        )
        return engine.policy.decide(spec, post, "low", {"flag": "isolate heal vs escalate"}).action

    assert decide(tau + 0.001) == "heal"
    assert decide(tau - 0.001) == "escalate"


# (e) The SAME engine handles CI's four causes, proving one shared decision engine.
def test_shared_engine_handles_four_cause_ci_domain(engine):
    def ci(**signals):
        return ConfidenceEngineInput(
            evidence_type="ci_log", source="ci", raw_signals=signals, context={"risk_tier": "default"}
        )

    dep = engine.evaluate(ci(log_signature="import_error", rerun="failed"))
    assert dep.classification == "dependency"
    assert dep.recommended_action == "auto-fix"

    flaky = engine.evaluate(ci(log_signature="timeout", rerun="passed"))
    assert flaky.classification == "flaky"
    assert flaky.recommended_action == "flag"

    bug = engine.evaluate(ci(log_signature="assertion", rerun="failed"))
    assert bug.classification == "bug"
    assert bug.recommended_action == "escalate"


# (f) Gates: no element, or an ambiguous match, makes healing impossible regardless of probability.
@pytest.mark.parametrize("matches", [0, 2, 5])
def test_unusable_relocation_blocks_heal(engine, matches):
    out = engine.evaluate(qa_evidence(**{**CLEAN, "relocated_match_count": matches}))
    assert out.recommended_action != "heal"
    assert "Blocked: heal" in out.reasoning_trace


# (g) classification is always a diagnosis, never an action.
def test_classification_is_never_an_action(engine):
    cases = [CLEAN, {**CLEAN, "uncaught_page_errors": 2}, {**CLEAN, "original_resolved_after_wait": True}]
    for signals in cases:
        out = engine.evaluate(qa_evidence(**signals))
        assert out.classification in CLASSIFICATIONS
        assert out.classification not in ACTIONS


# (h) Missing or incomplete weights fail loudly; nothing is defaulted.
def _write(tmp_path: Path, data) -> Path:
    path = tmp_path / "weights.yaml"
    path.write_text(yaml.safe_dump(data), encoding="utf-8")
    return path


def _synthetic():
    return yaml.safe_load(SYNTHETIC_WEIGHTS.read_text(encoding="utf-8"))


def test_missing_weights_file_raises(tmp_path):
    with pytest.raises(RuntimeError, match="not found"):
        ConfidenceEngine(tmp_path / "nope.yaml")


@pytest.mark.parametrize(
    "mutate, message",
    [
        (lambda d: d["qa"]["priors"].update(flaky=None), "not filled in"),
        (lambda d: d["qa"]["priors"].update(flaky=0.5), "must sum to 1"),
        (lambda d: d["qa"]["groups"]["timing"]["likelihoods"]["flaky"].update(resolved_after_wait=1.0), "strictly between"),
        (lambda d: d["qa"]["groups"]["state_progression"]["likelihoods"].pop("flaky"), "missing"),
        (lambda d: d["qa"]["hypotheses"].append("cosmic_rays"), "classification enum"),
        (lambda d: d["thresholds"]["qa"]["loss"]["low"].pop("escalate"), "missing"),
        (lambda d: d.pop("thresholds"), "required top-level section"),
    ],
)
def test_incomplete_weights_raise(tmp_path, mutate, message):
    data = _synthetic()
    mutate(data)
    with pytest.raises(RuntimeError, match=message):
        load_weights(_write(tmp_path, data))


def test_weights_must_match_adapter_groups(tmp_path):
    data = _synthetic()
    data["qa"]["groups"].pop("timing")
    with pytest.raises(RuntimeError, match="do not match the adapter"):
        ConfidenceEngine(_write(tmp_path, data))


def test_disabled_domain_refuses_to_evaluate(tmp_path):
    data = _synthetic()
    data["ci"] = {"enabled": False}
    engine = ConfidenceEngine(_write(tmp_path, data))
    with pytest.raises(RuntimeError, match="disabled"):
        engine.evaluate(ConfidenceEngineInput(evidence_type="x", source="ci", raw_signals={}, context={"risk_tier": "default"}))


# (i) Correlated signals from one fault count once: 2 or 3 indicators give the same group state.
def test_correlated_signals_counted_once(engine):
    two = qa_evidence(uncaught_page_errors=1, error_state_shown=True, failed_requests=0)
    three = qa_evidence(uncaught_page_errors=1, error_state_shown=True, failed_requests=4)
    assert posterior_of(engine, two).probs == pytest.approx(posterior_of(engine, three).probs)
    # A naive product of three separate penalties would have pushed "three" further down.
    p = posterior_of(engine, three).probs
    unnorm = {"stale_selector": 0.6 * 0.02, "likely_regression": 0.3 * 0.50, "flaky": 0.1 * 0.05}
    assert p["likely_regression"] == pytest.approx(unnorm["likely_regression"] / sum(unnorm.values()))


# (j) Every output validates against the contract's Pydantic model.
def test_outputs_validate_against_contract(engine):
    out = engine.evaluate(qa_evidence(**CLEAN))
    assert isinstance(out, ConfidenceEngineOutput)
    ConfidenceEngineOutput.model_validate(out.model_dump())
    assert 0 <= out.confidence_score <= 100


# (k) A selector that appears after waiting is timing flakiness: flag it, never heal it.
def test_resolved_after_wait_is_flaky_and_flagged(engine):
    ev = qa_evidence(
        selector_healed=False,
        relocated_match_count=None,
        original_resolved_after_wait=True,
        uncaught_page_errors=0,
        expected_state_reached=True,
        action_succeeded=True,
    )
    out = engine.evaluate(ev)
    assert out.classification == "flaky"
    assert out.recommended_action == "flag"


# (l) Risk tiers: the same evidence heals on a reversible step but escalates on an irreversible one.
def test_same_evidence_heals_low_risk_but_escalates_high_risk(engine):
    noisy_but_working = {**CLEAN, "console_errors": 3}  # harmless console noise, everything else fine
    low = engine.evaluate(qa_evidence("low", **noisy_but_working))
    high = engine.evaluate(qa_evidence("high", **noisy_but_working))
    assert low.classification == high.classification == "stale_selector"
    assert low.recommended_action == "heal"
    assert high.recommended_action == "escalate"


def test_clean_heal_is_healed(engine):
    out = engine.evaluate(qa_evidence(**CLEAN))
    assert out.classification == "stale_selector"
    assert out.recommended_action == "heal"
    assert out.confidence_score >= 90


def test_no_evidence_escalates(engine):
    out = engine.evaluate(qa_evidence())
    assert out.recommended_action == "escalate"
    assert "no evidence observed" in out.reasoning_trace


def test_unrecognised_pattern_escalates(tmp_path):
    data = _synthetic()
    data["thresholds"]["qa"]["unknown_pattern_floor"] = 0.95  # only near-perfect fits accepted
    engine = ConfidenceEngine(_write(tmp_path, data))
    out = engine.evaluate(qa_evidence(**{**CLEAN, "action_succeeded": False}))
    assert out.recommended_action == "escalate"
    assert "unrecognised evidence pattern" in out.reasoning_trace


def test_bad_input_is_rejected(engine):
    with pytest.raises(ValueError, match="risk_tier"):
        engine.evaluate(ConfidenceEngineInput(evidence_type="x", source="qa", raw_signals={}, context={}))
    with pytest.raises(ValueError, match="non-negative integer"):
        engine.evaluate(qa_evidence(uncaught_page_errors="lots"))


# NFR: decision latency well under 200 ms.
def test_decision_latency_under_200ms(engine):
    ev = qa_evidence(**CLEAN)
    start = time.perf_counter()
    for _ in range(200):
        engine.evaluate(ev)
    per_call_ms = (time.perf_counter() - start) * 1000 / 200
    assert per_call_ms < 200
