# ConfidenceEngine Input/Output Contract

**Status:** v1, implemented. Models: `src/core/models.py`. Engine: `src/core/engine.py`.
Design: `docs/adr/004-bayesian-confidence-engine.md`. QA signal keys: `docs/contracts/raw_signals.md`.

## Input: `ConfidenceEngineInput`

```json
{
  "evidence_type": "string, e.g. playwright_step",
  "source": "qa | ci",
  "raw_signals": "object, keys defined per source (raw_signals.md for qa)",
  "context": "object, must contain risk_tier"
}
```

- `context.risk_tier` is **required** and must match the source domain's configured loss tiers. QA
  uses `low | medium | high`; the synthetic CI fixture uses `default`. It selects the loss table in
  `weights.yaml`. A missing or unknown tier raises `ValueError`.
- All other `context` fields are for traceability only and are not weighted.
- `source="ci"` raises `RuntimeError` while `ci: enabled: false` in `weights.yaml`.

## Output: `ConfidenceEngineOutput`

```json
{
  "classification": "flaky | dependency | bug | infra | stale_selector | likely_regression",
  "confidence_score": "integer 0-100",
  "reasoning_trace": "string",
  "recommended_action": "heal | escalate | auto-fix | flag"
}
```

| Field | Meaning |
|---|---|
| `classification` | The most probable cause under Bayes' rule. A diagnosis only, never an action. |
| `recommended_action` | The action with the lowest expected loss for the step's risk tier. `escalate` is always available. Hard blocks remove actions first: QA `heal` requires exactly one relocated element and `expected_state_reached` must not be `false`. |
| `confidence_score` | `round(100 × P(the best available autonomous action is correct))`. If the decision is to act, it is the probability that the chosen action is right. If the decision is `escalate`, it is how sure the engine would have been had it acted. **It is not compared against a fixed threshold**, so an escalated step can still show a high score (e.g. a high-risk step that needs P ≥ 0.99). |
| `reasoning_trace` | Exact account: evidence and log-likelihoods, missing groups, posterior, blocked actions, expected losses, and decision. It omits break-even probabilities because the two-outcome formula can mislead when multiple causes and actions are present. |

The old rule "`recommended_action` comes from comparing `confidence_score` with a threshold
(e.g. 85)" is replaced by minimum expected loss. For a two-way heal-or-escalate choice the two are
equivalent, with break-even τ = C_mask / (C_mask + C_escalate) per risk tier (QA `heal`: low 0.83,
medium 0.95, high 0.99).

## Detailed output: `evaluate_detailed()`

Returns `(output, details)`. `details` is used by the API and UI, and is not part of the contract:

| Key | Content |
|---|---|
| `group_states` | Observed state per evidence group, `null` if not observed |
| `contributions` | ln P(state \| cause) per observed group |
| `missing_groups` | Groups left out of the calculation |
| `posterior` | P(cause \| evidence) for every cause |
| `fit` | Per-group geometric-mean likelihood of the best cause (unknown-pattern check) |
| `risk_tier` | Tier used |
| `expected_loss` | Expected loss per available action |
| `blocked` | Actions that were blocked, with reasons |
| `thresholds` | Break-even probability per available autonomous action |

## Known gaps

- `rerun` is approved for CI `flaky` (ADR 006) but not yet in the enum; task C2 adds it.
- `flaky` has a per-source meaning (QA: slow to render; CI: intermittent job), defined in the `docs/brief.md` glossary.
- The legacy `/api/legacy/ci/triage` route (`archive/poc/legacy_routes.py`) returns `recommended_action="rerun"`, which violates this contract. It is scripted and not used by the engine.
