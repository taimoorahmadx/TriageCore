"""Sensitivity analysis: which likelihood values do the decisions actually depend on?

Each likelihood P(state | cause) is scaled by -50% and +50% (its row is then
renormalised to sum to 1), and every evidence case is re-decided. A flip means
the decision for that case hinges on that number. That number is where the
justification in docs/contracts/weights_elicitation.md must be strongest.

Usage:  .venv/bin/python -m src.core.sensitivity [weights.yaml]
"""

from __future__ import annotations

import copy
import sys
from dataclasses import dataclass, replace
from pathlib import Path

from src.core.engine import ConfidenceEngine
from src.core.models import ConfidenceEngineInput
from src.core.weights import DEFAULT_WEIGHTS_PATH, GroupSpec, Weights

FACTORS = (0.5, 1.5)
CLAMP = (0.001, 0.999)


@dataclass(frozen=True)
class Flip:
    case: str
    parameter: str  # e.g. "qa.runtime_failure.stale_selector[1] x1.5"
    before: str
    after: str


def _perturbed(weights: Weights, domain: str, group: str, cause: str, state: str, factor: float) -> Weights:
    spec = weights.domains[domain]
    g = spec.groups[group]
    row = dict(g.likelihoods[cause])
    row[state] = min(max(row[state] * factor, CLAMP[0]), CLAMP[1])
    total = sum(row.values())
    likelihoods = copy.deepcopy(g.likelihoods)
    likelihoods[cause] = {s: v / total for s, v in row.items()}
    groups = {**spec.groups, group: GroupSpec(name=g.name, states=g.states, likelihoods=likelihoods)}
    return replace(weights, domains={**weights.domains, domain: replace(spec, groups=groups)})


def analyse(engine: ConfidenceEngine, cases: dict[str, ConfidenceEngineInput]) -> list[Flip]:
    baseline = {name: engine.evaluate(ev).recommended_action for name, ev in cases.items()}
    original = engine.weights
    flips: list[Flip] = []
    try:
        for domain, spec in original.domains.items():
            domain_cases = {n: ev for n, ev in cases.items() if ev.source == domain}
            for gname, group in spec.groups.items():
                for cause in spec.hypotheses:
                    for state in group.states:
                        for factor in FACTORS:
                            engine.weights = _perturbed(original, domain, gname, cause, state, factor)
                            for name, ev in domain_cases.items():
                                after = engine.evaluate(ev).recommended_action
                                if after != baseline[name]:
                                    param = f"{domain}.{gname}.{cause}[{state}] x{factor}"
                                    flips.append(Flip(name, param, baseline[name], after))
    finally:
        engine.weights = original
    return flips


def reference_cases() -> dict[str, ConfidenceEngineInput]:
    """Representative QA evidence patterns (the scenario suite will supply real ones)."""

    def qa(risk: str, **signals) -> ConfidenceEngineInput:
        raw = {"selector_healed": True, "relocated_match_count": 1, **signals}
        return ConfidenceEngineInput(evidence_type="playwright_step", source="qa", raw_signals=raw, context={"risk_tier": risk})

    clean = dict(uncaught_page_errors=0, failed_requests=0, error_state_shown=False, expected_state_reached=True,
                 console_errors=0, action_succeeded=True, original_resolved_after_wait=False)
    cases = {}
    for risk in ("low", "high"):
        cases[f"clean_heal/{risk}"] = qa(risk, **clean)
        cases[f"console_noise/{risk}"] = qa(risk, **{**clean, "console_errors": 2})
        cases[f"trap/{risk}"] = qa(risk, **{**clean, "uncaught_page_errors": 1, "error_state_shown": True,
                                            "expected_state_reached": False})
        cases[f"silent_noop/{risk}"] = qa(risk, **{**clean, "expected_state_reached": False})
        cases[f"tracking_404/{risk}"] = qa(risk, **{**clean, "failed_requests": 1})
        cases[f"slow_render/{risk}"] = qa(risk, **{**clean, "selector_healed": False, "relocated_match_count": None,
                                                   "original_resolved_after_wait": True})
    return cases


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_WEIGHTS_PATH
    engine = ConfidenceEngine(path)
    cases = {n: ev for n, ev in reference_cases().items() if ev.context["risk_tier"] in engine.weights.domains["qa"].loss}
    for name, ev in cases.items():
        out = engine.evaluate(ev)
        print(f"{name:22s} -> {out.recommended_action:9s} ({out.classification}, confidence {out.confidence_score})")
    flips = analyse(engine, cases)
    print(f"\n{len(flips)} decision flip(s) under +/-50% perturbation of single likelihoods:")
    for f in flips:
        print(f"  {f.case:22s} {f.before} -> {f.after}   when {f.parameter}")
