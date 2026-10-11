# Weights Elicitation Sheet

**Author of the values:** _(human, per AGENTS.md)_  **Date:** _____
**Applies to:** `src/core/weights.yaml` (QA section). Every value below must also be entered there.
**Check:** `.venv/bin/python -m src.core.weights` (validity), then `.venv/bin/python -m src.core.sensitivity` (which values the decisions depend on).

How to answer: think of **100 broken test steps of the given cause** and estimate how many would show each state. Write the number as a probability (e.g. 30 of 100 = 0.30). Each row must sum to 1. Never use exactly 0 or 1. Give a one-line reason, ideally citing a source, the scenario suite, or an observation.

## 1. Priors: P(cause)

| Cause | Of 100 broken steps, how many are this cause? | Value | Reason / source |
|---|---|---|---|
| `stale_selector` | harmless rename/move, app works | | |
| `likely_regression` | real bug in the app | | |
| `flaky` | element was only slow to appear | | |

## 2. Likelihoods: P(evidence state | cause)

### `runtime_failure`: how many of {page error, error banner, failed request} fired after the click?
| Cause | 0 | 1 | 2+ | Reason |
|---|---|---|---|---|
| stale_selector | | | | |
| likely_regression | | | | |
| flaky | | | | |

### `state_progression`: did the expected result appear?
| Cause | reached | not_reached | Reason |
|---|---|---|---|
| stale_selector | | | |
| likely_regression | | | |
| flaky | | | |

### `console_noise`: any `console.error` after the click? (Third-party noise is common, so expect weak differences.)
| Cause | present | absent | Reason |
|---|---|---|---|
| stale_selector | | | |
| likely_regression | | | |
| flaky | | | |

### `action_outcome`: did the click execute without a Playwright error?
| Cause | succeeded | failed | Reason |
|---|---|---|---|
| stale_selector | | | |
| likely_regression | | | |
| flaky | | | |

### `timing`: did the original selector appear when re-tried with backoff?
| Cause | resolved_after_wait | not_resolved | Reason |
|---|---|---|---|
| stale_selector | | | |
| likely_regression | | | |
| flaky | | | |

## 3. Costs: loss(action, true cause), per risk tier

Use one consistent unit, e.g. engineer-minutes, including the downstream cost of a shipped bug. A correct action usually costs 0.

| Tier | Action | if stale_selector | if likely_regression | if flaky | Reason |
|---|---|---|---|---|---|
| low | heal | | | | |
| low | flag | | | | |
| low | escalate | | | | |
| medium | heal | | | | |
| medium | flag | | | | |
| medium | escalate | | | | |
| high | heal | | | | |
| high | flag | | | | |
| high | escalate | | | | |

**Implied heal threshold per tier** (printed in every reasoning trace): τ = C_mask / (C_mask + C_escalate), where C_mask = cost(heal | likely_regression) and C_escalate = cost(escalate | stale_selector). Check that the result matches your intuition. E.g. 0.85 means masking a bug is about 5.7× worse than a needless escalation.

## 4. Unknown-pattern floor

`unknown_pattern_floor` (0–1): if the evidence fits no cause at least this well (per-group average likelihood), the engine escalates as "unrecognised pattern". Value: ____  Reason: ____
