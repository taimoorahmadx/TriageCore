# Evidence Contract: `raw_signals` and `context` for the QA Agent

**Status:** v1. Implemented by `QAAdapter` in `src/core/evidence.py`; the design is recorded in `docs/adr/004-bayesian-confidence-engine.md`.
**Applies to:** `ConfidenceEngineInput` with `source="qa"` (`src/core/models.py`).
**CI signals:** out of scope for Iteration 1; they will be defined alongside Milestone 4/5.

## Why this contract exists

`ConfidenceEngineInput.raw_signals` is typed as `Dict[str, Any]`. On its own that does not tell the browser layer what to send or the engine what to weight. This file fixes the exact keys, types and measurement rules, so both modules can be built and tested independently.

## Measurement window

All post-action signals are counted **only between the action and the end of the observation window**:

1. Attach listeners.
2. Perform the click.
3. Wait up to `observation_window_ms`.
4. Detach the listeners.

Errors raised before the action (for example on page load) are not attributed to the action.

## `raw_signals` (QA)

| Key | Type | Meaning | How it is measured |
|---|---|---|---|
| `selector_healed` | bool | The original selector failed and a relocated selector was used | `True` if the original selector timed out |
| `relocated_match_count` | int | Number of elements the relocated selector matches | `page.locator(sel).count()`. `0` = relocation failed; `>1` = ambiguous |
| `action_succeeded` | bool | The click executed without a Playwright error | No timeout or exception from `click()` |
| `uncaught_page_errors` | int | Uncaught JS exceptions during the window | `page.on("pageerror")` |
| `console_errors` | int | `console.error` messages during the window | `page.on("console")` where `type == "error"` |
| `failed_requests` | int | Network failures during the window | `requestfailed` events, plus responses with status ≥ 400 |
| `expected_state_reached` | bool or null | The step's success marker became visible | `expected_state_selector` visible within the window. `null` if the step defines no marker |
| `error_state_shown` | bool or null | The step's known error marker became visible | `error_state_selector` visible within the window. `null` if none is defined |
| `original_resolved_after_wait` | bool or null | The original selector appeared after all when re-tried with backoff, **before** any relocation | Re-try the original selector (e.g. 3 attempts, 500 ms × 2ⁿ). `True` means slow render, not a renamed element |

`selector_healed` is `False` when the original selector resolved after waiting. No relocation happens in that case, and `relocated_match_count` is `null`.

**Removed from the PoC:** if relocation fails, the PoC silently falls back to the known correct selector (`target_id`). That fallback is not allowed. A failed relocation must show up as `relocated_match_count = 0`.

## `context` (QA)

Apart from `risk_tier`, context fields are **not weighted**. They exist for traceability and the reasoning trace.

| Key | Type | Meaning |
|---|---|---|
| `step_id` | int | Step number within the suite |
| `page_url` | str | Page under test |
| `original_selector` | str | Selector the test was written with |
| `proposed_selector` | str or null | Selector proposed by the LLM |
| `expected_state_selector` | str or null | Success marker for this step |
| `error_state_selector` | str or null | Error marker for this step, if any |
| `observation_window_ms` | int | Length of the post-action window |
| `relocation_latency_ms` | int | Time the LLM relocation took |
| `risk_tier` | str | **Required, and used by the decision.** It is the only weighted context field: it selects the loss table in `weights.yaml` (`low` = reversible step, e.g. add to cart; `high` = irreversible step, e.g. payment) |

## How the engine uses these signals

The signals are pooled into **evidence groups**. Signals that share a cause count once:

| Group | From | States |
|---|---|---|
| `runtime_failure` | `uncaught_page_errors>0`, `error_state_shown`, `failed_requests>0` | `0`, `1`, `2+` (observed indicators that fired) |
| `state_progression` | `expected_state_reached` | `reached`, `not_reached` |
| `console_noise` | `console_errors>0` | `present`, `absent` |
| `action_outcome` | `action_succeeded` | `succeeded`, `failed` |
| `timing` | `original_resolved_after_wait` | `resolved_after_wait`, `not_resolved` |

A `null` signal means "not observed". It is left out of the calculation, never treated as "fine".

- **`classification`** is the most probable cause under Bayes' rule (`stale_selector`, `likely_regression` or `flaky`). It is a diagnosis only.
- **`recommended_action`** is the action with the lowest expected loss for the step's `risk_tier`, with `escalate` always available. Classification never encodes an action.
- **Hard preconditions:** `heal` is impossible unless `selector_healed` is true and `relocated_match_count == 1`. Zero matches, an ambiguous match (more than one), or an unknown count blocks it, because ambiguity is never resolved silently.

## Resolved questions

1. **Console errors** form their own weakly weighted group (`console_noise`). Third-party noise therefore cannot on its own outweigh a reached success state.
2. **Ambiguous relocation** (`relocated_match_count > 1`) is a hard block on `heal`, not a weight.
3. **Observation window:** still open. The PoC used 500 ms; the scenario suite's slow-handler case will be used to tune it.
