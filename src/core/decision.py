"""Decision layer of the ConfidenceEngine: choose the action with the lowest expected loss.

    E[loss(action)] = sum over causes of  loss(action, cause) * P(cause | evidence)

``escalate`` is always available as the reject option (Chow's rule): when no
autonomous action is cheap enough in expectation, the decision goes to a human.
The loss table depends on the step's risk tier, so an irreversible step (e.g.
payment) demands stronger evidence before acting than a reversible one.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from src.core.evidence import Posterior
from src.core.weights import REJECT_ACTION, DomainSpec


@dataclass(frozen=True)
class Decision:
    action: str
    expected_loss: dict[str, float]  # considered action -> expected loss
    blocked: dict[str, str]  # action -> reason it could not be taken
    confidence: float  # P(best available autonomous action is correct), 0 if none available
    risk_tier: str


class DecisionPolicy(Protocol):
    def decide(self, spec: DomainSpec, posterior: Posterior, risk_tier: str, blocked: dict[str, str]) -> Decision: ...


class MinExpectedLossPolicy:
    def decide(self, spec: DomainSpec, posterior: Posterior, risk_tier: str, blocked: dict[str, str]) -> Decision:
        if risk_tier not in spec.loss:
            raise ValueError(f"risk_tier '{risk_tier}' is not defined for '{spec.name}'; expected one of {list(spec.loss)}")
        loss = spec.loss[risk_tier]
        p = posterior.probs

        available = [a for a in spec.autonomous_actions if a not in blocked] + [REJECT_ACTION]
        expected = {a: sum(loss[a][h] * p[h] for h in spec.hypotheses) for a in available}

        # Ties go to escalate: when acting is no better than asking, ask.
        action = min(expected, key=lambda a: (expected[a], a != REJECT_ACTION))

        # Confidence = P(the autonomous action is correct): the chosen one if we act,
        # otherwise the best available one (i.e. how sure we would have been had we acted).
        def p_correct(a: str) -> float:
            return sum(p[h] for h in spec.correct_under[a])

        if action != REJECT_ACTION:
            confidence = p_correct(action)
        else:
            autonomous = [a for a in available if a != REJECT_ACTION]
            confidence = max((p_correct(a) for a in autonomous), default=0.0)
        return Decision(
            action=action,
            expected_loss=expected,
            blocked=dict(blocked),
            confidence=confidence,
            risk_tier=risk_tier,
        )
