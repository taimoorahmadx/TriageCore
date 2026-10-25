"""ConfidenceEngine: the shared decision engine used by the QA and CI agents.

Given evidence about a failure, it answers two separate questions:

1. Diagnosis: what most probably caused the failure?  -> ``classification``
2. Decision: should the system act on its own, or hand it to a human?
   -> ``recommended_action``

Pipeline (identical for every source):

    raw_signals --adapter--> group states --SemiNaiveBayes--> P(cause | evidence)
                --MinExpectedLossPolicy--> action  --> reasoning trace

The engine is pure computation: no database, network or LLM calls. A
DecisionStore adapter backed by SQLite is planned around it (ADR 005).
"""

from __future__ import annotations

from pathlib import Path

from src.core.decision import Decision, DecisionPolicy, MinExpectedLossPolicy
from src.core.evidence import (
    DirectStateAdapter,
    EvidenceAdapter,
    EvidenceModel,
    Posterior,
    QAAdapter,
    SemiNaiveBayes,
)
from src.core.models import ConfidenceEngineInput, ConfidenceEngineOutput
from src.core.weights import (
    DEFAULT_WEIGHTS_PATH,
    REJECT_ACTION,
    DomainSpec,
    implied_threshold,
    load_weights,
)

RISK_TIER_KEY = "risk_tier"


class ConfidenceEngine:
    def __init__(
        self,
        weights_path: str | Path = DEFAULT_WEIGHTS_PATH,
        model: EvidenceModel | None = None,
        policy: DecisionPolicy | None = None,
        adapters: dict[str, EvidenceAdapter] | None = None,
    ) -> None:
        self.weights = load_weights(weights_path)  # raises RuntimeError if anything is missing
        self.model = model or SemiNaiveBayes()
        self.policy = policy or MinExpectedLossPolicy()
        self.adapters = adapters or {"qa": QAAdapter(), "ci": DirectStateAdapter()}
        for spec in self.weights.domains.values():
            self._check_adapter_matches(spec)

    def _check_adapter_matches(self, spec: DomainSpec) -> None:
        """The adapter's evidence groups and weights.yaml's tables must agree exactly."""
        adapter = self.adapters.get(spec.name)
        if adapter is None:
            raise RuntimeError(f"No evidence adapter registered for source '{spec.name}'.")
        expected = adapter.group_states_spec
        if expected is None:
            return
        declared = {name: g.states for name, g in spec.groups.items()}
        if declared != expected:
            raise RuntimeError(
                f"weights.yaml groups for '{spec.name}' do not match the adapter.\n"
                f"  weights.yaml: {declared}\n  adapter:      {expected}"
            )

    def evaluate(self, evidence: ConfidenceEngineInput) -> ConfidenceEngineOutput:
        return self.evaluate_detailed(evidence)[0]

    def evaluate_detailed(self, evidence: ConfidenceEngineInput) -> tuple[ConfidenceEngineOutput, dict]:
        """Same decision as ``evaluate``, plus a structured breakdown for dashboards and reports."""
        spec = self.weights.domain(evidence.source)
        adapter = self.adapters[evidence.source]

        risk_tier = evidence.context.get(RISK_TIER_KEY)
        if not isinstance(risk_tier, str):
            raise ValueError(f"context.{RISK_TIER_KEY} is required; one of {list(spec.loss)}")

        states = adapter.group_states(evidence.raw_signals, spec)
        posterior = self.model.posterior(spec, states)

        blocked = dict(adapter.blocked_actions(evidence.raw_signals))
        if not posterior.observed:
            reason = "no evidence observed"
        elif posterior.fit < spec.unknown_pattern_floor:
            reason = f"unrecognised evidence pattern (fit {posterior.fit:.3f} < floor {spec.unknown_pattern_floor})"
        else:
            reason = None
        if reason:
            blocked.update({a: reason for a in spec.autonomous_actions if a not in blocked})

        decision = self.policy.decide(spec, posterior, risk_tier, blocked)
        classification = posterior.most_probable
        output = ConfidenceEngineOutput(
            classification=classification,  # diagnosis only, never an action
            confidence_score=round(100 * decision.confidence),
            reasoning_trace=build_trace(spec, states, posterior, decision),
            recommended_action=decision.action,  # type: ignore[arg-type]
        )
        details = {
            "group_states": states,
            "contributions": posterior.log_likelihoods,
            "missing_groups": list(posterior.missing),
            "posterior": posterior.probs,
            "fit": posterior.fit,
            "risk_tier": risk_tier,
            "expected_loss": decision.expected_loss,
            "blocked": decision.blocked,
            "thresholds": {
                a: implied_threshold(spec, risk_tier, a) for a in spec.autonomous_actions if a not in decision.blocked
            },
        }
        return output, details


def build_trace(spec: DomainSpec, states: dict[str, str | None], posterior: Posterior, decision: Decision) -> str:
    """Human-readable, exact account of how the decision was reached."""
    parts = []
    evidence = []
    for name in posterior.observed:
        lls = ", ".join(f"{h} {posterior.log_likelihoods[name][h]:+.2f}" for h in spec.hypotheses)
        evidence.append(f"{name}={states[name]} [ln P: {lls}]")
    parts.append("Evidence: " + ("; ".join(evidence) if evidence else "none observed"))
    if posterior.missing:
        parts.append("Not observed (ignored, not assumed fine): " + ", ".join(posterior.missing))
    parts.append(
        "Posterior: " + ", ".join(f"{h} {posterior.probs[h]:.3f}" for h in spec.hypotheses)
        + f" -> most probable cause: {posterior.most_probable}"
    )
    if decision.blocked:
        parts.append("Blocked: " + "; ".join(f"{a} ({why})" for a, why in decision.blocked.items()))
    losses = ", ".join(f"{a} {v:.2f}" for a, v in decision.expected_loss.items())
    parts.append(f"Risk tier '{decision.risk_tier}', expected loss: {losses}")
    verdict = "escalate to a human" if decision.action == REJECT_ACTION else decision.action
    parts.append(f"Decision: {verdict}")
    return ". ".join(parts) + "."
