# TODO

The one to-do list, in the order to do it. Agents update the boxes here and nowhere else.

`[x]` done · `[~]` doing · `[ ]` todo · `[!]` blocked (reason after the line)

**How to work:** open a new agent chat and type `next` (or `do <id>`). One task per chat.
Review the diff, run `make test`, commit. Task details are in `docs/tasks/<id>.md`.

**Branches:** each section below is one git branch. Finish every task in it, open a pull request,
merge it into `main`, then start the next section from an up-to-date `main`:
`git checkout main && git pull && git checkout -b <branch>`

## 1. `code-refactor` · cleanup
- [x] A1 · Single FastAPI app in `src/api/app.py`
- [x] A2 · Move the scripted POC into `archive/poc/`
- [x] A3 · Move the scripted frontend screens into `frontend/src/legacy/`
- [x] A5 · Remove unused dependencies, tidy `.env.example`
- [ ] A6 · GitHub Actions CI: lint, tests and frontend build on every PR

→ Merge into `main`.

## 2. `feature/store` · decision database
- [ ] S1 · SQLite store for every decision, `GET /api/qa/decisions`

→ Merge into `main` (needed by C5 and D1).

## 3. `feature/qa-agent` · QA agent safety
- [ ] A4 · Errors while collecting evidence escalate instead of crashing
- [ ] Q1 · Healed steps show a suggested selector patch (never applied)

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
- [ ] C1 · CI evidence contract · after C2 · *needs you: decide the evidence groups*
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
- [ ] B1 · 10+ QA cases on a real open-source web app · after Q4 · *needs you: pick the app, write the labels before any run*

→ Merge into `main`.

## 8. `chore/deploy` · deployment
- [ ] D1 · Docker deployment on a VM with an API token · after A5, S1 · *needs you: create the VM*

→ Merge into `main`.

## 9. Human work for FYP-1 Final (not for AI)
- [ ] Record the solo ownership change in `docs/log/changes.md`
- [ ] Review and rewrite `docs/spec.md` and `docs/plan.md` in your own words
- [ ] Fill in `docs/disclosure.md` §2
- [ ] Check the hand calculation in `test_posterior_matches_hand_calculation`
- [ ] Rehearse a walkthrough of every module (what it does, alternatives, what breaks, how to change it)
- [ ] Report, poster, presentation
