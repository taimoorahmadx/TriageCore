# Plan: architecture, stack, contracts

**Status:** Draft, AI-written 2026-10-25, to be reviewed and owned by the team.
Marked **[built]** or **[planned]**. Planned items are specified as tasks in `docs/tasks/` (index: `docs/tasks.md`).

## 1. Shape

```mermaid
flowchart LR
  subgraph QA["QA agent [built]"]
    SC[qa_scenarios.yaml] --> QP[agents/qa_pipeline.py]
    QP --> RU[browser/runner.py]
    RU --> RL[browser/relocator.py · Groq]
  end
  subgraph CI["CI agent [planned]"]
    CO[tests/ci_corpus/] --> CP[agents/ci_pipeline.py]
    WH[ci/webhooks.py] --> ST
    CP --> TR[ci/truncate.py]
    CP --> FX[ci/facts.py · Groq]
    CP --> TC[ci/tracing.py]
  end
  subgraph CORE["core [built, pure]"]
    EN[engine.py] --> EV[evidence.py · adapters + Bayes]
    EN --> DE[decision.py · min expected loss]
    EN --> W[weights.py + weights.yaml]
  end
  QP --> EN
  CP --> EN
  QP --> ST[(db/store.py · SQLite [planned])]
  CP --> ST
  API[api/app.py] --> QP
  API --> CP
  API --> ST
  UI[frontend] --> API
  EVAL[eval/] --> QP
  EVAL --> CP
```

**Dependency rule:** `core` imports nothing from the project except its own modules. `browser` and
`ci` import `core` models only where needed. `agents` import `core`, `browser`, `ci`, `db`. `api`
and `eval` import `agents`. Nothing imports `archive/`, except `api/app.py` mounting the legacy router.

## 2. Module layout (target after the cleanup tasks)

```text
src/
  core/      models.py weights.py weights.yaml evidence.py decision.py engine.py sensitivity.py   [built]
  browser/   runner.py relocator.py                                                             [built]
  ci/        truncate.py webhooks.py facts.py tracing.py corpus.py                              [planned]
  db/        store.py                                                                           [planned]
  agents/    qa_pipeline.py [built] · ci_pipeline.py [planned]
  eval/      evaluate.py [built] · stats.py evaluate_ci.py [planned]
  api/       app.py [built] · qa_routes.py [built] · ci_routes.py [planned]
archive/poc/ poc_recovery.py demo_safe.py demo_trap.py legacy_routes.py   (scripted proposal demo)
tests/       test_*.py · dummy/ · scenarios/ · fixtures/ · ci_corpus/ [planned]
frontend/src/ qa/ [built] · ci/ [planned] · legacy/ [planned: moved from components/]
```

## 3. Flows

### QA step [built]
1. Click the original selector (1 s). Works → step `passed`, no triage.
2. Re-wait the original (500, 1000, 2000 ms). Appears → click it, observe.
3. Else relocate: container HTML + intent → Groq → one selector → count matches. Click only on exactly 1.
4. Observe: listeners on, click, wait up to 1500 ms for the expected marker, settle 400 ms, read the error marker, listeners off.
5. `raw_signals` + `context` → engine → decision. Score against ground truth.

### CI case [planned]
1. Load a corpus case: log text, run metadata (attempts, conclusion), the ≤ 10 most recent commits with touched files.
2. `truncate_log` (16k token budget, head 30% / tail 70%).
3. `facts.extract` (Groq, schema-validated `CILogFacts`; failure → all `null`).
4. `tracing.attribute(failing_files, commits)` → attributed commit or `ambiguous_commit`.
5. `CIAdapter` maps facts + rerun history + tracing to group states; `auto-fix` blocked unless exactly one attributed commit.
6. Engine → decision → store → score against the case label.

### Webhook [planned]
Verify signature → validate payload → accept only failed `workflow_run` → store a job record → 202.
Fetching logs from GitHub and processing jobs live is FYP-2.

## 4. Invariants

| # | Invariant | Enforced in | Test |
|---|---|---|---|
| I1 | `classification` is diagnosis only; only the policy sets `recommended_action` | `engine.py`, enums | `test_classification_is_never_an_action` |
| I2 | Weight values have documented provenance; agent-proposed probabilities are provisional until evaluated; policy costs need owner approval; invalid or missing values raise | `weights.py` | `test_incomplete_weights_raise` |
| I3 | Autonomous actions need unambiguous targets: `heal` exactly one relocated element; `auto-fix` exactly one attributed commit | adapters `blocked_actions` | `test_unusable_relocation_blocks_heal`; C8 |
| I4 | Missing evidence is left out, never treated as fine | `SemiNaiveBayes` | `test_missing_group_leaves_posterior_unchanged` |
| I5 | Signals from one fault count once (evidence groups) | adapters | `test_correlated_signals_counted_once` |
| I6 | LLM output is untrusted: selectors are verified in the browser; log facts are schema-validated; LLM text never enters the decision | runner, `ci/facts.py` | `test_invalid_selector_counts_as_no_match`; C6 |
| I7 | Every failure path ends in `escalate`, never in an autonomous action | runner, pipelines | `test_relocation_failure_is_recorded`; A4 |
| I8 | Nothing is auto-merged or auto-applied: `heal` suggests a patch, `auto-fix` proposes a PR (FYP-2) | pipelines | Q1 |
| I9 | Webhooks verify `X-Hub-Signature-256` before reading the payload | `ci/webhooks.py` | C5 |
| I10 | Test stand-ins (`FixedRelocator`, `KnownRenames`, `FixedFactExtractor`) never run in the real pipeline | pipelines default to real implementations | review |

## 5. Stack

| Concern | Choice | Why / ADR |
|---|---|---|
| Language | Python 3.10+ | — |
| Browser | Playwright sync API, Chromium | ADR 001 |
| LLM | Groq `openai/gpt-oss-20b` via `urllib` (no SDK) | ADR 003 |
| Engine | Semi-naive Bayes + minimum expected loss | ADR 004 |
| Orchestration | Plain Python pipelines (no LangGraph) | ADR 005 |
| API | FastAPI + Uvicorn; plain `def` handlers (Playwright sync needs a worker thread) | ADR 001 |
| Store | SQLite via the standard `sqlite3` module, file `data/triagecore.sqlite3` (`TRIAGECORE_DB_PATH`) | ADR 005 |
| Frontend | React + Vite + Tailwind v4, oxlint | — |
| Tests | pytest; FastAPI `TestClient` (needs `httpx`) | — |
| Deploy | One Docker image on the Playwright base image; one VM | Task D1 |

## 6. Contracts

| Contract | File | Status |
|---|---|---|
| Engine input/output | `docs/contracts/engine_io.md` | built |
| QA `raw_signals` / `context` | `docs/contracts/raw_signals.md` | built |
| QA weights rationale | `docs/contracts/weights_elicitation.md` | built |
| CI facts, groups, context | `docs/contracts/ci_signals.md` | task C1 |
| CI weights rationale | `docs/contracts/ci_weights_elicitation.md` | task C9 (initial proposal), C12 (dataset calibration) |
| Decision record (store) | `docs/contracts/decision_record.md` | task S1 |

## 7. Decisions (resolved 2026-10-25)

| ID | Decision | Record |
|---|---|---|
| D1 | FYP-1 CI = offline vertical slice with fixture-based initial comparison + webhook endpoint tested with saved payloads; reviewed real corpus/full benchmark and final calibration follow after the CI implementation branch at the end of FYP-1; live GitHub App, queue, fix PRs and live trial move to FYP-2 | ADR 006, `log/changes.md` |
| D2 | `heal` returns a suggested patch (unified diff); files are never edited automatically | this plan, FR-Q7 |
| D3 | `rerun` added to the action enum for CI `flaky` | ADR 006 |
| D4 | `expected_state_selector` is supplied by the test author; when absent, that evidence is missing (weaker decision); documented as a limitation | this plan |
| D5 | No LangGraph; plain Python pipelines | ADR 005 |
| D6 | SQLite store; Postgres only if FYP-2 needs it | ADR 005 |
| D7 | One `flaky` label; meaning defined per source in `brief.md` | `brief.md` glossary |

Still open (owner decides inside the task): CI loss costs (C9). CI probability tables may be agent-proposed in C9 and calibrated on reviewed data in C12 at the end of FYP-1.

## 8. Security and data

- The API launches browsers and spends Groq credits. Locally: bind to `127.0.0.1`. Deployed: set `TRIAGECORE_API_TOKEN` (FR-A3).
- Page HTML and CI logs are sent to Groq. Before sending a CI log, mask values that look like tokens or keys (`ghp_…`, `gsk_…`, `AKIA…`, `Bearer …`). Disclose Groq use in the tool disclosure sheet.
- Logs are untrusted input: wrapped in delimiters in the prompt, output validated against an enum-only schema (I6).

## 9. Known limitations

- QA evaluation: 12 steps on team-built pages and team-written labels. It shows the method works on known cases, not that it generalises. 0 of 4 masked regressions bounds the true rate only below ~53% (one-sided 95%); at least 59 regression cases with 0 misses are needed for < 5%.
- `container_selector` gives the LLM the right HTML region; HTML is cut at 6000 characters.
- Fixed observation window (1.5 s + 0.4 s); slow handlers can be misread.
- CI probability weights are provisional until calibrated on reviewed labelled data (C12); held-out cases must not be used during fitting.

## 10. Risks and fallbacks

| Area | Risk | Fallback |
|---|---|---|
| Relocation | LLM relocation fails often | Deterministic locator ladder (role/text/structure) behind the same `Relocator` interface; escalate when unsure |
| Weights | Elicited or agent-proposed probabilities may be miscalibrated | Sensitivity analysis; fit CI tables on reviewed training cases and evaluate on a separate holdout (C12); owner approves policy costs |
| Baselines | `simple_rule` matches TriageCore on the QA suite | Report honestly; show where the engine differs (risk tiers, missing evidence, CI reuse) with targeted cases |
| CI logs | Logs exceed the context window | Middle truncation; then the failing step's output only |
| Commit tracing | Large PRs make tracing unreliable | Flag the whole PR (ambiguous) instead of one commit |
| CI corpus | Fewer than 5 cases for a cause | More repositories; then clearly marked injected failures in a clean repository |
| Benchmark | 50+ real QA failures take too long | Mutations of real open-source apps (task B1), labels written before runs |
| Acceptance (FYP-2) | No consenting project | Another FYP team's repository |
| LLM provider | Groq unavailable or rate-limited | Fail safe (escalate); a second provider behind the same interfaces |
