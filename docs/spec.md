# Spec: behaviour and acceptance criteria

**Status:** Draft, AI-written 2026-10-25, to be reviewed and owned by the team.
Every requirement has an ID that tasks refer to. Status: **Done**, **Partial**, **Todo**, **FYP-2**.
"Check" is how to prove it: a test name, a command, or an observable result.
Field and type details live in `docs/contracts/`; this file says what must happen.

## 1. Engine (`src/core/`)

| ID | Requirement | Check | Status |
|---|---|---|---|
| FR-E1 | Accepts `ConfidenceEngineInput` and returns `ConfidenceEngineOutput` exactly as in `contracts/engine_io.md`. | `test_outputs_validate_against_contract` | Done |
| FR-E2 | `classification` is the most probable cause and is never an action name. | `test_classification_is_never_an_action` | Done |
| FR-E3 | `recommended_action` minimises expected loss for `context.risk_tier`; `escalate` is always available; ties go to `escalate`. | `test_policy_matches_threshold_formula`, `test_same_evidence_heals_low_risk_but_escalates_high_risk` | Done |
| FR-E4 | Refuses to start if `weights.yaml` is missing, has `null` values, rows not summing to 1, or probabilities of exactly 0 or 1. Raises `RuntimeError` listing every problem. | `test_missing_weights_file_raises`, `test_incomplete_weights_raise` | Done |
| FR-E5 | Evidence whose fit is below `unknown_pattern_floor`, or no evidence at all, escalates. | `test_unrecognised_pattern_escalates`, `test_no_evidence_escalates` | Done |
| FR-E6 | Missing evidence (`null`) changes nothing in the posterior. | `test_missing_group_leaves_posterior_unchanged` | Done |
| FR-E7 | Every output has a reasoning trace with each observed group's log-likelihood, the posterior, expected losses and the decision. | `reasoning_trace` contains "Posterior:" and "Decision:" | Done (not asserted by a test) |
| FR-E8 | The same engine code serves QA (3 causes) and CI (4 causes); only adapters and `weights.yaml` differ. | `test_shared_engine_handles_four_cause_ci_domain`; later C8 tests with real CI weights | Partial |
| FR-E9 | `rerun` is a valid `recommended_action`. | Task C2 test | Todo |
| FR-E10 | Every decision can be stored and listed with its evidence, output and details. | Task S1 tests | Todo |

## 2. QA agent (`src/browser/`, `src/agents/qa_pipeline.py`)

| ID | Requirement | Check | Status |
|---|---|---|---|
| FR-Q1 | If the original selector fails, re-try it with pauses 500, 1000, 2000 ms before relocating. If it appears, do not relocate. | `test_slow_render_resolves_without_relocation` | Done |
| FR-Q2 | Otherwise ask the relocator for one CSS selector, given the element's intent and the container HTML (max 6000 chars). | `GroqRelocator`; live run | Done |
| FR-Q3 | Click only if the proposed selector matches exactly one element. | `test_ambiguous_selector_is_not_clicked` | Done |
| FR-Q4 | During the observation window record: uncaught page errors, app console errors (excluding the browser's "Failed to load resource" lines), failed requests and HTTP ≥ 400, expected-state and error-state markers. | `test_crash_is_observed`, `test_error_banner_is_observed`, `test_tracking_404_is_counted`, `test_console_noise_is_counted` | Done |
| FR-Q5 | A relocation error or invalid selector results in `relocated_match_count = 0`, so `heal` is blocked. | `test_relocation_failure_is_recorded`, `test_invalid_selector_counts_as_no_match` | Done |
| FR-Q6 | Any unexpected exception while collecting a step's evidence yields a step with `status: "error"` and `fail_safe_action: "escalate"`, and the remaining steps of that scenario are marked the same way. The API returns 200 with those steps, not 500. | Task A4 test | Todo |
| FR-Q7 | When the decision is `heal`, the step includes `suggested_patch`: a unified diff replacing the original selector with the proposed one in `tests/scenarios/qa_scenarios.yaml`. No file is ever written. | Task Q1 test | Todo |

## 3. CI agent (`src/ci/`, `src/agents/ci_pipeline.py`)

| ID | Requirement | Check | Status |
|---|---|---|---|
| FR-C1 | `POST /api/ci/webhook` verifies `X-Hub-Signature-256` (HMAC-SHA256 of the raw body with `GITHUB_WEBHOOK_SECRET`, constant-time compare). Missing or wrong signature → 401. Secret not configured → 503. Body not JSON or missing required fields → 400. Event that is not a failed `workflow_run` → 202 `{"accepted": false}`. Failed `workflow_run` → 202 `{"accepted": true, "run_id": ...}` and a stored job record. Never 500 on bad input. | Task C5 tests with saved payloads | Todo |
| FR-C2 | `truncate_log(text, max_tokens=16000)` returns the text unchanged if it fits; otherwise it keeps the head (30% of the budget) and the tail (70%), inserts one marker line `[... N lines removed by TriageCore ...]`, and sets `truncated=True`. Tokens are estimated as `ceil(len(text) / 4)`. | Task C4 tests | Todo |
| FR-C3 | Log facts are extracted by the LLM into the `CILogFacts` model (`contracts/ci_signals.md`). Invalid JSON or schema → one retry → all facts `null` (missing evidence). LLM free text never reaches the engine. | Task C6 tests | Todo |
| FR-C4 | Commit tracing over at most the 10 most recent commits: exactly one commit touching a failing file → attributed; two or more → `ambiguous_commit=true`, none attributed; zero → none attributed. Never guess. | Task C7 tests | Todo |
| FR-C5 | `auto-fix` is blocked unless exactly one commit is attributed. | Task C8 test | Todo |
| FR-C6 | The CI pipeline runs a corpus case end to end (truncate → facts → tracing → engine) and scores it against the case label. | Task C10 | Todo |
| FR-C7 | The agent opens (never merges) a PR whose body contains `confidence_score` and `reasoning_trace`. | — | FYP-2 |

## 4. Evaluation (`src/eval/`)

| ID | Requirement | Check | Status |
|---|---|---|---|
| FR-V1 | QA evaluation judges the same evidence with every policy: `blind_heal`, `penalty_rule`, `simple_rule`, `triagecore`, and `llm_judge` when enabled. | `tests/test_pipeline.py`; tasks Q3, Q4 | Partial |
| FR-V2 | Reports per policy: acceptable decisions, masked regressions, needless escalations, each with a 95% Wilson interval. | Task B2 | Todo |
| FR-V3 | Saves JSON + CSV to `results/`, and `results/qa_eval_latest.json`. | `make eval` | Done |
| FR-V4 | CI evaluation compares `triagecore` with `rerun_all` and `keyword_rule` on the corpus, same metrics. | Task C10 | Todo |
| FR-V5 | At least 10 QA cases come from a real open-source web app, not only the team's pages. | Task B1 | Todo |

## 5. API and UI

| ID | Requirement | Check | Status |
|---|---|---|---|
| FR-A1 | One FastAPI app `src/api/app.py` serves `/health`, `/api/qa/*`, `/api/ci/*`, the static `/tests/dummy/*` pages, and the legacy scripted routes. | Task A1/A2 route list check | Todo |
| FR-A2 | `GET /api/qa/decisions?limit=N` lists stored decisions, newest first. | Task S1 | Todo |
| FR-A3 | When `TRIAGECORE_API_TOKEN` is set, every `POST` except `/api/ci/webhook` requires header `Authorization: Bearer <token>` (401 otherwise). | Task D1 | Todo |
| FR-U1 | QA Engine screen: run one scenario live and show evidence, posterior, expected losses, decision; error steps show "escalated (fail-safe)" with the error text. | Manual + `npm run build` | Partial (error steps: A4) |
| FR-U2 | Evaluation screen shows the latest evaluation. | Manual | Done |
| FR-U3 | A CI screen runs one corpus case and shows facts, tracing, posterior and decision. | Task C11 | Todo |
| FR-U4 | The legacy "Proposal PoC (scripted)" tab still works, isolated in `frontend/src/legacy/`. | Task A3 | Todo |

## 6. Non-functional

| ID | Target | Check | Status |
|---|---|---|---|
| NFR-1 | Engine decision < 200 ms | `test_decision_latency_under_200ms` | Done |
| NFR-2 | QA heal cycle < 10 s per step (p95 over the suite) | Evaluation summary, task Q2 | Todo |
| NFR-3 | DOM extraction < 500 ms (p95) | `timings_ms.dom_extract`, task Q2 | Todo |
| NFR-4 | Webhook response < 2 s | Task C5 test asserts < 2 s | Todo |
| NFR-5 | CI triage < 30 s per case | CI evaluation summary | Todo |
| NFR-6 | Masked regressions: lower than every baseline, reported with a 95% CI (FYP-2: upper bound < 5%) | Evaluation summary | Partial |
| NFR-7 | Fail-safe: no failure path produces an autonomous action | FR-Q5, FR-Q6, FR-C3 | Partial |
| NFR-8 | Runs on a VM via Docker, reachable from another machine | Task D1 | Todo |
| NFR-9 | Secrets only in `.env`; never logged or committed | Review | Done |
