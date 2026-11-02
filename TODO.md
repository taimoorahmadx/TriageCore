# TODO

The one to-do list, in the order to do it. Agents update the boxes here and nowhere else.

`[x]` done · `[~]` doing · `[ ]` todo · `[!]` blocked (reason after the line)

**How to work:** open a new agent chat and type `next` (or `do <id>`). One task per chat.
Review the diff, run `make test`, commit. Task details are in `docs/tasks/<id>.md`.

**Branches:** each section below is one git branch. Finish every task in it, open a pull request,
merge it into `main`, then start the next section from an up-to-date `main`:
`git checkout main && git pull && git checkout -b <branch>`

## 0. `fix/audit` · architecture audit fixes (2026-10-25)
No task files. Steps and file:line evidence are in `.agents/tasks/architecture-audit-2026-10-25.md`
(section named per line). The project owner approved all of these on 2026-10-25.
- [x] X1 · Block `heal` when `expected_state_reached` is false; add tests; update `raw_signals.md`, `engine_io.md` (hard preconditions), ADR 004; add a `docs/log/changes.md` row · audit M4(a)
- [x] X2 · Drop the misleading "Break-even" line from the trace; add a trace-content test (FR-E7); fix `engine_io.md` · audit M5
- [x] X3 · Quarantine scripted API routes under `/api/legacy/*`; update `frontend/src/legacy/` callers and AGENTS.md · audit M6
- [x] X4 · Fix `recommended_action` docstring in `src/core/models.py` (min expected loss, ADR 004) and its 5 ruff findings so `make lint` exits 0 · audit M7
- [x] X5 · Move `FixedRelocator` from `src/browser/relocator.py` into `tests/` · audit S10
- [x] X6 · Fix stale doc/code lines (comments and docs only) · audit Q7 items 3–7, 10–12

→ Merge into `main`.

## 1. `code-refactor` · cleanup
- [x] A1 · Single FastAPI app in `src/api/app.py`
- [x] A2 · Move the scripted POC into `archive/poc/`
- [x] A3 · Move the scripted frontend screens into `frontend/src/legacy/`
- [x] A5 · Remove unused dependencies, tidy `.env.example`
- [x] A6 · GitHub Actions CI: lint, tests and frontend build on every PR

→ Merge into `main`.

## 2. `feature/store` · decision database
- [x] S1 · SQLite store for every decision, `GET /api/qa/decisions`

→ Merge into `main` (needed by C5 and D1).

## 3. `feature/qa-agent` · QA agent safety
- [x] A4 · Errors while collecting evidence escalate instead of crashing
- [x] Q1 · Healed steps show a suggested selector patch (never applied)

→ Merge into `main`.

## 4. `feature/eval` · stronger evaluation
- [x] B2 · 95% confidence intervals in evaluation results
- [x] Q4 · `simple_rule` baseline (an obvious hand rule) · after B2
- [x] Q2 · Measure heal cycle (< 10 s) and DOM extraction (< 500 ms) · after B2
- [x] Q3 · `llm_judge` baseline ("just ask the LLM") · after Q4

→ Merge into `main`.

## 5. `feature/ci-agent` · CI agent, part 1
- [x] C2 · Add `rerun` to the engine's action list
- [x] C4 · Truncate long CI logs in the middle
- [x] C1 · CI evidence contract · after C2 · approved 2026-10-26
- [x] C7 · Trace a failure to a commit, flag ambiguous ones · after C1
- [x] C6 · LLM extracts structured facts from a log · after C1, C4
- [x] C8 · `CIAdapter`: CI evidence into the engine · after C1, C7

→ Merge into `main`.

## 6. `feature/ci-agent-2` · CI agent, part 2
- [x] C5 · GitHub webhook endpoint with signature check · after S1
- [x] C9 · Initial CI weight proposal · after C8 · *agent may propose provisional probabilities; project owner approves policy costs*
- [x] C10 · CI pipeline and preliminary 2-fixture smoke comparison · after C6, C9 (smoke check only; extraction failures reported separately by C13; not real-world effectiveness evidence; audit 2026-10-27)
- [x] C11 · CI screen in the UI · after C10

→ Merge into `main`.

## 7. `feature/real-app-cases` · real-world QA cases
- [x] B1 · Real-app QA cases and evaluation

→ Merge into `main`.

## 8. `chore/deploy` · deployment
- [!] D1 · Docker deployment on a VM with an API token · after A5, S1 · deferred by user to focus on local build; resume when ready to create the VM

→ Merge into `main`.

## 9. `feature/fyp1-final-calibration` · end-of-FYP-1 dataset and calibration
- [x] Q5 · Surface the Modern TodoMVC real-app scenarios in QA Engine (live), with a working app preview link · after B1
- [x] C3 · Build and human-review the CI corpus · 206 reviewed cases; at least 3 per cause (owner-approved 2026-11-02)
- [!] C12 · Final CI weight calibration on reviewed data · after C3, C10, C11 and after the FYP-1 demo · only 3 reviewed flaky cases; collect and human-review more flaky cases after the demo before starting calibration
- [x] C13 · Report CI fact-extraction failures separately and rerun the fixture smoke evaluation · after C10; do before C3 evaluation
- [x] B3 · Rerun and freeze the QA baseline evaluation · after B2, Q3, Q4
- [x] C14 · Demo reviewed historical GitHub Actions runs in CI Engine from the C3 corpus · after C3, C11, C13

→ Merge into `main`.

**Merge/demo sequence:** C12 is intentionally deferred. Merge this branch with Q5, C3, C13, B3,
and C14 complete; C12 does not block that merge. Then finish FYP-1 demo preparation and run the
demo. After the demo, collect and review more flaky cases. Only when the corpus
supports a meaningful train/holdout split should C12 change from `[!]` to `[ ]` and be done on a
follow-up calibration branch from up-to-date `main`.

## After FYP-1
FYP-2 plan (M6 live CI and PRs, M7 benchmark and calibration, M8 user acceptance): `docs/fyp2.md`.
Remaining FYP-2 tasks are written at the start of FYP-2 after reviewing FYP-1 results.
