"""Load and validate ``weights.yaml`` for the ConfidenceEngine.

The file holds every number the engine reasons with: prior probabilities of each
cause, likelihood tables P(evidence state | cause), and the loss (cost) matrix
used to choose an action. Weight provenance and approval rules are in AGENTS.md.

Validation is strict on purpose. Any missing key, unfilled placeholder (``null``),
or malformed probability raises ``RuntimeError`` listing every problem found.
Nothing is ever silently defaulted.
"""

from __future__ import annotations

import math
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, get_args

import yaml

from src.core.models import ConfidenceEngineOutput

DEFAULT_WEIGHTS_PATH = Path(__file__).resolve().parent / "weights.yaml"

# The contract enums are the single source of truth for what the engine may output.
CLASSIFICATIONS = frozenset(get_args(ConfidenceEngineOutput.model_fields["classification"].annotation))
ACTIONS = frozenset(get_args(ConfidenceEngineOutput.model_fields["recommended_action"].annotation))

REJECT_ACTION = "escalate"  # always available: hand the decision to a human
UNINFORMATIVE = "uninformative"  # explicit "this group tells us nothing about this cause"
SUM_TOLERANCE = 1e-6


@dataclass(frozen=True)
class GroupSpec:
    """One evidence group: its possible states and P(state | cause) for every cause."""

    name: str
    states: tuple[str, ...]
    likelihoods: dict[str, dict[str, float]]  # cause -> state -> probability


@dataclass(frozen=True)
class DomainSpec:
    """Everything the engine needs to reason about one source (``qa`` or ``ci``)."""

    name: str
    hypotheses: tuple[str, ...]
    priors: dict[str, float]
    groups: dict[str, GroupSpec]
    correct_under: dict[str, frozenset[str]]  # autonomous action -> causes where it is right
    loss: dict[str, dict[str, dict[str, float]]]  # risk tier -> action -> cause -> cost
    unknown_pattern_floor: float

    @property
    def autonomous_actions(self) -> tuple[str, ...]:
        return tuple(self.correct_under)


@dataclass(frozen=True)
class Weights:
    domains: dict[str, DomainSpec]  # enabled domains only
    disabled: frozenset[str]

    def domain(self, source: str) -> DomainSpec:
        if source in self.disabled:
            raise RuntimeError(
                f"Domain '{source}' is disabled in weights.yaml (enabled: false); "
                "its likelihood tables have not been authored yet."
            )
        if source not in self.domains:
            raise RuntimeError(f"weights.yaml has no section for source '{source}'.")
        return self.domains[source]


class _Problems:
    """Collects every validation problem so the author can fix them all in one pass."""

    def __init__(self) -> None:
        self.items: list[str] = []

    def add(self, path: str, message: str) -> None:
        self.items.append(f"{path}: {message}")

    def require(self, node: Any, key: str, path: str) -> Any:
        if not isinstance(node, dict) or key not in node:
            self.add(f"{path}.{key}", "missing")
            return None
        value = node[key]
        if value is None:
            self.add(f"{path}.{key}", "not filled in (placeholder)")
        return value


def _probability(value: Any, path: str, problems: _Problems) -> float | None:
    """A probability must lie strictly between 0 and 1.

    0 or 1 would mean absolute certainty that no evidence could ever overturn
    (Cromwell's rule), which is never justified for real-world evidence.
    """
    if value is None:
        problems.add(path, "not filled in (placeholder)")
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        problems.add(path, f"must be a number, got {value!r}")
        return None
    if not 0.0 < float(value) < 1.0:
        problems.add(path, f"must be strictly between 0 and 1, got {value}")
        return None
    return float(value)


def _cost(value: Any, path: str, problems: _Problems) -> float | None:
    if value is None:
        problems.add(path, "not filled in (placeholder)")
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0:
        problems.add(path, f"must be a non-negative number, got {value!r}")
        return None
    return float(value)


def _parse_group(name: str, raw: Any, hypotheses: tuple[str, ...], path: str, problems: _Problems) -> GroupSpec | None:
    states = problems.require(raw, "states", path)
    table = problems.require(raw, "likelihoods", path)
    if not isinstance(states, list) or len(states) < 2:
        problems.add(f"{path}.states", "must list at least two states")
        return None
    states = tuple(str(s) for s in states)
    if not isinstance(table, dict):
        return None

    likelihoods: dict[str, dict[str, float]] = {}
    for h in hypotheses:
        row = table.get(h)
        row_path = f"{path}.likelihoods.{h}"
        if row == UNINFORMATIVE:
            likelihoods[h] = {s: 1.0 / len(states) for s in states}
            continue
        if not isinstance(row, dict):
            problems.add(row_path, f"missing (give P(state | {h}) for each state, or '{UNINFORMATIVE}')")
            continue
        parsed = {s: _probability(row.get(s), f"{row_path}.{s}", problems) for s in states}
        extra = set(row) - set(states)
        if extra:
            problems.add(row_path, f"unknown states {sorted(extra)}")
        if all(v is not None for v in parsed.values()):
            total = sum(parsed.values())  # type: ignore[arg-type]
            if abs(total - 1.0) > SUM_TOLERANCE:
                problems.add(row_path, f"probabilities over states must sum to 1, got {total:.6f}")
            likelihoods[h] = parsed  # type: ignore[assignment]
    extra_h = set(table) - set(hypotheses)
    if extra_h:
        problems.add(f"{path}.likelihoods", f"rows for unknown causes {sorted(extra_h)}")
    return GroupSpec(name=name, states=states, likelihoods=likelihoods)


def _parse_domain(name: str, raw: dict, thresholds: Any, problems: _Problems) -> DomainSpec | None:
    path = name
    hypotheses = problems.require(raw, "hypotheses", path)
    if not isinstance(hypotheses, list) or len(hypotheses) < 2:
        problems.add(f"{path}.hypotheses", "must list at least two causes")
        return None
    hypotheses = tuple(hypotheses)
    unknown = set(hypotheses) - CLASSIFICATIONS
    if unknown:
        problems.add(f"{path}.hypotheses", f"{sorted(unknown)} are not in the contract's classification enum")

    raw_priors = problems.require(raw, "priors", path) or {}
    priors = {h: _probability(raw_priors.get(h), f"{path}.priors.{h}", problems) for h in hypotheses}
    if all(v is not None for v in priors.values()):
        total = sum(priors.values())  # type: ignore[arg-type]
        if abs(total - 1.0) > SUM_TOLERANCE:
            problems.add(f"{path}.priors", f"must sum to 1, got {total:.6f}")

    raw_groups = problems.require(raw, "groups", path) or {}
    groups = {}
    for gname, graw in raw_groups.items():
        g = _parse_group(gname, graw, hypotheses, f"{path}.groups.{gname}", problems)
        if g is not None:
            groups[gname] = g

    raw_actions = problems.require(raw, "actions", path) or {}
    correct_under: dict[str, frozenset[str]] = {}
    for action, causes in raw_actions.items():
        apath = f"{path}.actions.{action}"
        if action not in ACTIONS:
            problems.add(apath, "not in the contract's recommended_action enum")
        if action == REJECT_ACTION:
            problems.add(apath, f"'{REJECT_ACTION}' is the built-in reject option; do not list it here")
            continue
        if not isinstance(causes, list) or not causes or set(causes) - set(hypotheses):
            problems.add(apath, "must list the causes under which this action is correct")
            continue
        correct_under[action] = frozenset(causes)

    tpath = f"thresholds.{name}"
    if not isinstance(thresholds, dict):
        problems.add(tpath, "missing")
        return None
    floor = _probability(thresholds.get("unknown_pattern_floor"), f"{tpath}.unknown_pattern_floor", problems)
    raw_loss = problems.require(thresholds, "loss", tpath) or {}
    if not raw_loss:
        problems.add(f"{tpath}.loss", "must define at least one risk tier")
    loss: dict[str, dict[str, dict[str, float]]] = {}
    for tier, tier_raw in raw_loss.items():
        loss[tier] = {}
        for action in (*correct_under, REJECT_ACTION):
            row = (tier_raw or {}).get(action)
            rpath = f"{tpath}.loss.{tier}.{action}"
            if not isinstance(row, dict):
                problems.add(rpath, "missing (give the cost of this action under each cause)")
                continue
            loss[tier][action] = {h: _cost(row.get(h), f"{rpath}.{h}", problems) for h in hypotheses}  # type: ignore[misc]

    return DomainSpec(
        name=name,
        hypotheses=hypotheses,
        priors=priors,  # type: ignore[arg-type]
        groups=groups,
        correct_under=correct_under,
        loss=loss,
        unknown_pattern_floor=floor if floor is not None else 0.0,
    )


def load_weights(path: str | Path = DEFAULT_WEIGHTS_PATH) -> Weights:
    """Parse and fully validate weights.yaml. Raises RuntimeError on any problem."""
    path = Path(path)
    if not path.is_file():
        raise RuntimeError(f"weights file not found: {path}. The engine refuses to run without it.")
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise RuntimeError(f"weights file {path} is not valid YAML: {exc}") from exc

    problems = _Problems()
    for section in ("qa", "ci", "thresholds"):
        if not isinstance(raw, dict) or section not in raw:
            problems.add(section, "required top-level section missing (see AGENTS.md)")
    if problems.items:
        raise RuntimeError("Invalid weights.yaml:\n  - " + "\n  - ".join(problems.items))

    domains: dict[str, DomainSpec] = {}
    disabled: set[str] = set()
    thresholds = raw["thresholds"] or {}
    for name in ("qa", "ci"):
        section = raw[name]
        if isinstance(section, dict) and section.get("enabled") is False:
            disabled.add(name)
            continue
        if not isinstance(section, dict):
            problems.add(name, "must be a mapping (or set 'enabled: false')")
            continue
        spec = _parse_domain(name, section, thresholds.get(name), problems)
        if spec is not None:
            domains[name] = spec

    if problems.items:
        raise RuntimeError(
            f"Invalid weights.yaml ({len(problems.items)} problem(s)):\n  - " + "\n  - ".join(problems.items)
        )
    return Weights(domains=domains, disabled=frozenset(disabled))


def implied_threshold(spec: DomainSpec, tier: str, action: str) -> float | None:
    """Break-even P(action is correct) between taking ``action`` and escalating.

    Two-outcome view: the action is either right (cheapest right cause) or wrong
    (costliest wrong cause). Acting beats escalating when

        P(right) >= (L_act,wrong - L_esc,wrong) / ((L_act,wrong - L_esc,wrong) + (L_esc,right - L_act,right))

    With L_act,right = 0, L_act,wrong = C_mask, L_esc,right = C_escalate and
    L_esc,wrong = 0, this is the familiar tau = C_mask / (C_mask + C_escalate).
    Used for traces and reports; the engine itself always minimises full expected loss.
    """
    loss = spec.loss[tier]
    right = spec.correct_under[action]
    wrong = [h for h in spec.hypotheses if h not in right]
    if not wrong:
        return None
    h_wrong = max(wrong, key=lambda h: loss[action][h])
    h_right = min(right, key=lambda h: loss[action][h])
    gain_if_wrong = loss[action][h_wrong] - loss[REJECT_ACTION][h_wrong]
    gain_if_right = loss[REJECT_ACTION][h_right] - loss[action][h_right]
    denom = gain_if_wrong + gain_if_right
    if math.isclose(denom, 0.0):
        return None
    return gain_if_wrong / denom


if __name__ == "__main__":
    # Quick check while filling in the numbers:  .venv/bin/python -m src.core.weights
    target = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_WEIGHTS_PATH
    try:
        w = load_weights(target)
    except RuntimeError as err:
        print(err)
        sys.exit(1)
    print(f"OK: {target}")
    for name, spec in w.domains.items():
        print(f"  {name}: causes={list(spec.hypotheses)} groups={list(spec.groups)} tiers={list(spec.loss)}")
    for name in sorted(w.disabled):
        print(f"  {name}: disabled")
