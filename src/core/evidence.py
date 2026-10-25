"""Evidence layer of the ConfidenceEngine.

1. Adapters turn a domain's ``raw_signals`` (see docs/contracts/raw_signals.md)
   into one discrete *state* per evidence group, or ``None`` when that evidence
   was not observed. This is the only domain-specific code in the engine.
2. ``SemiNaiveBayes`` combines the group states into a posterior probability
   over causes using Bayes' rule.

Signals that share a cause (e.g. a page error, an error banner and a failed
request all produced by one broken click handler) are pooled into a single
group, so the same underlying fault is counted once rather than three times.
Groups are treated as conditionally independent given the cause.
"""

from __future__ import annotations

import math
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Protocol

from src.core.weights import DomainSpec

GroupStates = dict[str, str | None]  # group name -> observed state, or None if missing


class EvidenceAdapter(Protocol):
    group_states_spec: dict[str, tuple[str, ...]] | None  # None = defined by weights.yaml

    def group_states(self, raw_signals: Mapping[str, Any], spec: DomainSpec) -> GroupStates: ...

    def blocked_actions(self, raw_signals: Mapping[str, Any]) -> dict[str, str]: ...


def _optional_bool(raw: Mapping[str, Any], key: str) -> bool | None:
    value = raw.get(key)
    if value is None or isinstance(value, bool):
        return value
    raise ValueError(f"raw_signals.{key} must be true, false or null, got {value!r}")


def _optional_count(raw: Mapping[str, Any], key: str) -> int | None:
    value = raw.get(key)
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f"raw_signals.{key} must be a non-negative integer or null, got {value!r}")
    return value


class QAAdapter:
    """Maps browser telemetry from a healed (or re-waited) test step to group states."""

    group_states_spec: dict[str, tuple[str, ...]] | None = {
        "runtime_failure": ("0", "1", "2+"),
        "state_progression": ("reached", "not_reached"),
        "console_noise": ("present", "absent"),
        "action_outcome": ("succeeded", "failed"),
        "timing": ("resolved_after_wait", "not_resolved"),
    }

    def group_states(self, raw_signals: Mapping[str, Any], spec: DomainSpec) -> GroupStates:
        page_errors = _optional_count(raw_signals, "uncaught_page_errors")
        failed_requests = _optional_count(raw_signals, "failed_requests")
        error_banner = _optional_bool(raw_signals, "error_state_shown")
        console_errors = _optional_count(raw_signals, "console_errors")
        state_reached = _optional_bool(raw_signals, "expected_state_reached")
        action_ok = _optional_bool(raw_signals, "action_succeeded")
        resolved = _optional_bool(raw_signals, "original_resolved_after_wait")

        # Runtime-failure group: how many independent indicators fired (only observed ones count).
        observed = [s for s in (page_errors, failed_requests, error_banner) if s is not None]
        if observed:
            fired = sum(1 for s in observed if s)
            runtime = "0" if fired == 0 else "1" if fired == 1 else "2+"
        else:
            runtime = None

        def pick(flag: bool | None, yes: str, no: str) -> str | None:
            return None if flag is None else (yes if flag else no)

        return {
            "runtime_failure": runtime,
            "state_progression": pick(state_reached, "reached", "not_reached"),
            "console_noise": None if console_errors is None else ("present" if console_errors > 0 else "absent"),
            "action_outcome": pick(action_ok, "succeeded", "failed"),
            "timing": pick(resolved, "resolved_after_wait", "not_resolved"),
        }

    def blocked_actions(self, raw_signals: Mapping[str, Any]) -> dict[str, str]:
        """Actions that cannot be taken at all, regardless of probabilities.

        Healing means applying a relocated selector, so it is only possible when
        exactly one element was relocated and the expected state was reached.
        Ambiguity is never resolved silently.
        """
        healed = _optional_bool(raw_signals, "selector_healed")
        matches = _optional_count(raw_signals, "relocated_match_count")
        state_reached = _optional_bool(raw_signals, "expected_state_reached")
        if state_reached is False:
            return {"heal": "expected state was not reached"}
        if healed is not True:
            return {"heal": "no relocated selector to apply (original selector was used)"}
        if matches is None:
            return {"heal": "relocated_match_count unknown"}
        if matches == 0:
            return {"heal": "relocated selector matched no element"}
        if matches > 1:
            return {"heal": f"relocated selector is ambiguous ({matches} elements match)"}
        return {}


class DirectStateAdapter:
    """For domains whose raw_signals already name a state per group: {group: state | null}.

    Used for CI until the Iteration 2 log-fact adapter exists, and for tests.
    """

    group_states_spec: dict[str, tuple[str, ...]] | None = None

    def group_states(self, raw_signals: Mapping[str, Any], spec: DomainSpec) -> GroupStates:
        unknown = set(raw_signals) - set(spec.groups)
        if unknown:
            raise ValueError(f"raw_signals has unknown evidence groups {sorted(unknown)}")
        states: GroupStates = {}
        for name, group in spec.groups.items():
            value = raw_signals.get(name)
            if value is not None and value not in group.states:
                raise ValueError(f"raw_signals.{name}={value!r} is not one of {list(group.states)}")
            states[name] = value
        return states

    def blocked_actions(self, raw_signals: Mapping[str, Any]) -> dict[str, str]:
        return {}


@dataclass(frozen=True)
class Posterior:
    probs: dict[str, float]  # cause -> P(cause | evidence)
    log_likelihoods: dict[str, dict[str, float]]  # observed group -> cause -> ln P(state | cause)
    observed: tuple[str, ...]
    missing: tuple[str, ...]
    fit: float  # per-group geometric-mean likelihood of the best-explaining cause

    @property
    def most_probable(self) -> str:
        return max(self.probs, key=self.probs.__getitem__)


class EvidenceModel(Protocol):
    def posterior(self, spec: DomainSpec, states: GroupStates) -> Posterior: ...


class SemiNaiveBayes:
    """ln P(cause | E) = ln P(cause) + sum over observed groups of ln P(state | cause), normalised.

    Missing groups are marginalised out: they contribute nothing, rather than
    being assumed "fine".
    """

    def posterior(self, spec: DomainSpec, states: GroupStates) -> Posterior:
        log_post = {h: math.log(spec.priors[h]) for h in spec.hypotheses}
        log_lik_total = dict.fromkeys(spec.hypotheses, 0.0)
        contributions: dict[str, dict[str, float]] = {}
        observed, missing = [], []

        for name, group in spec.groups.items():
            state = states.get(name)
            if state is None:
                missing.append(name)
                continue
            observed.append(name)
            contributions[name] = {}
            for h in spec.hypotheses:
                ll = math.log(group.likelihoods[h][state])
                contributions[name][h] = ll
                log_post[h] += ll
                log_lik_total[h] += ll

        # Normalise in log space (log-sum-exp) for numerical stability.
        top = max(log_post.values())
        z = top + math.log(sum(math.exp(v - top) for v in log_post.values()))
        probs = {h: math.exp(v - z) for h, v in log_post.items()}

        fit = math.exp(max(log_lik_total.values()) / len(observed)) if observed else 0.0
        return Posterior(
            probs=probs,
            log_likelihoods=contributions,
            observed=tuple(observed),
            missing=tuple(missing),
            fit=fit,
        )
