# Weights Elicitation Sheet

**Author of the values:** Abdul Mohaimin (Member 2)  **Date:** 2026-10-11
**Method:** a guided elicitation session. For each question the AI described the meaning of the number and offered 3–4 framed options with their consequences; the author chose every value. Reasons below are the author's chosen rationale.
**Applies to:** `src/core/weights.yaml` (QA section). Every value below must also be entered there.
**Check:** `.venv/bin/python -m src.core.weights` (validity), then `.venv/bin/python -m src.core.sensitivity` (which values the decisions depend on).

How to answer: think of **100 broken test steps of the given cause** and estimate how many would show each state. Write the number as a probability (e.g. 30 of 100 = 0.30). Each row must sum to 1. Never use exactly 0 or 1. Give a one-line reason, ideally citing a source, the scenario suite, or an observation.

## 1. Priors: P(cause)

| Cause | Of 100 broken steps, how many are this cause? | Value | Reason / source |
|---|---|---|---|
| `stale_selector` | harmless rename/move, app works | 0.70 | Most missing buttons are front-end refactors |
| `likely_regression` | real bug in the app | 0.15 | Real bugs are a minority of selector failures |
| `flaky` | element was only slow to appear | 0.15 | Slow rendering is an occasional cause |

## 2. Likelihoods: P(evidence state | cause)

### `runtime_failure`: how many of {page error, error banner, failed request} fired after the click?
| Cause | 0 | 1 | 2+ | Reason |
|---|---|---|---|---|
| stale_selector | 0.90 | 0.08 | 0.02 | A working app rarely errors; occasional unrelated background errors |
| likely_regression | 0.30 | 0.35 | 0.35 | A fair share of bugs are silent (no error); the result check catches those |
| flaky | 0.90 | 0.08 | 0.02 | Once the element appears, a slow page behaves like a healthy one |

### `state_progression`: did the expected result appear?
| Cause | reached | not_reached | Reason |
|---|---|---|---|
| stale_selector | 0.90 | 0.10 | Usually reached; sometimes the LLM picks a similar but wrong element, or the check is strict |
| likely_regression | 0.10 | 0.90 | Bugs almost always stop the expected result |
| flaky | 0.85 | 0.15 | Usually reached, but the result can also be slow and miss the window |

### `console_noise`: any `console.error` after the click? (Third-party noise is common, so expect weak differences.)
| Cause | present | absent | Reason |
|---|---|---|---|
| stale_selector | 0.15 | 0.85 | Clean apps rarely log errors |
| likely_regression | 0.60 | 0.40 | Bugs usually log errors |
| flaky | 0.20 | 0.80 | Slightly noisier than a clean app |

### `action_outcome`: did the click execute without a Playwright error?
| Cause | succeeded | failed | Reason |
|---|---|---|---|
| stale_selector | 0.95 | 0.05 | Clicks mostly succeed |
| likely_regression | 0.75 | 0.25 | A bug sometimes leaves the button covered or disabled |
| flaky | 0.90 | 0.10 | Mostly succeeds once the element has appeared |

### `timing`: did the original selector appear when re-tried with backoff?
| Cause | resolved_after_wait | not_resolved | Reason |
|---|---|---|---|
| stale_selector | 0.02 | 0.98 | A renamed element never comes back |
| likely_regression | 0.05 | 0.95 | Bugs rarely make the original element reappear |
| flaky | 0.90 | 0.10 | A slow element almost always appears within the wait |

## 3. Costs: loss(action, true cause), per risk tier

Use one consistent unit, e.g. engineer-minutes, including the downstream cost of a shipped bug. A correct action usually costs 0.

| Tier | Action | if stale_selector | if likely_regression | if flaky | Reason |
|---|---|---|---|---|---|
| low | heal | 0 | 5 | 3 | Masking a bug costs 5 needless escalations; replacing a valid selector costs 3 |
| low | flag | 1 | 5 | 0 | A bug labelled 'flaky' is effectively hidden (= masking); a mislabelled rename is cheap |
| low | escalate | 1 | 0 | 1 | Unit of cost: one needless escalation ≈ 5–10 engineer-minutes |
| medium | heal | 0 | 20 | 3 | Masking a bug costs 20 needless escalations; replacing a valid selector costs 3 |
| medium | flag | 1 | 20 | 0 | A bug labelled 'flaky' is effectively hidden (= masking); a mislabelled rename is cheap |
| medium | escalate | 1 | 0 | 1 | Unit of cost: one needless escalation ≈ 5–10 engineer-minutes |
| high | heal | 0 | 100 | 3 | Masking a bug costs 100 needless escalations; replacing a valid selector costs 3 |
| high | flag | 1 | 100 | 0 | A bug labelled 'flaky' is effectively hidden (= masking); a mislabelled rename is cheap |
| high | escalate | 1 | 0 | 1 | Unit of cost: one needless escalation ≈ 5–10 engineer-minutes |

**Implied heal threshold per tier** (printed in every reasoning trace): τ = C_mask / (C_mask + C_escalate), where C_mask = cost(heal | likely_regression) and C_escalate = cost(escalate | stale_selector). Check that the result matches your intuition. E.g. 0.85 means masking a bug is about 5.7× worse than a needless escalation.

## 4. Unknown-pattern floor

`unknown_pattern_floor` (0–1): if the evidence fits no cause at least this well (per-group average likelihood), the engine escalates as "unrecognised pattern". Value: **0.10**  Reason: moderately strict; unusual clue combinations go to a human.

**Implied heal thresholds:** low 5/6 ≈ 0.83, medium 20/21 ≈ 0.95, high 100/101 ≈ 0.99.

## 5. Sensitivity result (2026-10-11)

`python -m src.core.sensitivity` scales each likelihood by ±50% across 12 reference cases. **6 decision flips**, all in one case: `silent_noop/low` (the click succeeds but nothing happens, with no error). Its P(stale_selector) of 0.79 sits just below the low-tier heal threshold of 0.83, so it escalates by a small margin. This is the case where the weights matter most, and the scenario suite and FYP-II calibration should focus on it.
