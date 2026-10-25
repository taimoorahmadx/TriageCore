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
- [ ] B2 · 95% confidence intervals in evaluation results
- [ ] Q4 · `simple_rule` baseline (an obvious hand rule) · after B2
- [ ] Q2 · Measure heal cycle (< 10 s) and DOM extraction (< 500 ms) · after B2
- [ ] Q3 · `llm_judge` baseline ("just ask the LLM") · after Q4

→ Merge into `main`.

## 5. `feature/ci-agent` · CI agent, part 1
- [ ] C2 · Add `rerun` to the engine's action list
- [ ] C4 · Truncate long CI logs in the middle
- [ ] C1 · CI evidence contract · after C2 · *needs you: decide the evidence groups* · decided 2026-10-25: evidence = pre-rerun facts only, rerun outcome is the label (audit M2a); `blocked_actions` cannot see `context` (audit Q1), resolve here
- [ ] C7 · Trace a failure to a commit, flag ambiguous ones · after C1
- [ ] C3 · Corpus of 30–40 real failed CI runs · after C1 · *needs you: verify every label*
- [ ] C6 · LLM extracts structured facts from a log · after C1, C4
- [ ] C8 · `CIAdapter`: CI evidence into the engine · after C1, C7

→ Merge into `main`.

## 6. `feature/ci-agent-2` · CI agent, part 2
- [ ] C5 · GitHub webhook endpoint with signature check · after S1
- [ ] C9 · CI weights · after C8 · *needs you: write every number; the agent only adds placeholders*
- [ ] C10 · CI pipeline and evaluation against baselines · after C3, C6, C9
- [ ] C11 · CI screen in the UI · after C10

→ Merge into `main`.

## 7. `feature/real-app-cases` · real-world QA cases
- [ ] B1 · 10+ QA cases on a real open-source web app · after Q4 · *needs you: pick the app, write the labels before any run* · project owner writes the labels (weights were AI-drafted), freeze the weights first (audit M3d)

→ Merge into `main`.

## 8. `chore/deploy` · deployment
- [ ] D1 · Docker deployment on a VM with an API token · after A5, S1 · *needs you: create the VM*

→ Merge into `main`.

## After FYP-1
FYP-2 plan (M6 live CI and PRs, M7 benchmark and calibration, M8 user acceptance): `docs/fyp2.md`.
No tasks yet; they are written at the start of FYP-2.

## 9. Human work for FYP-1 Final (not for AI)
- [ ] Get supervisor sign-off on the method change (X1 hard block, CI pre-rerun evidence)
- [ ] Review and rewrite `docs/spec.md` and `docs/plan.md` in your own words
- [ ] Fill in `docs/disclosure.md` §2
- [ ] Check the hand calculation in `test_posterior_matches_hand_calculation`
- [ ] Tune QA evidence probabilities using labeled cases; compare against current values on held-out cases (keep mistake costs human-set)
- [ ] Rehearse a walkthrough of every module (what it does, alternatives, what breaks, how to change it)
- [ ] Report, poster, presentation
