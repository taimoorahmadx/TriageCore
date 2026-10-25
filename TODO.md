# TODO

The one to-do list. Look here to know what to do next. Agents update the boxes here and nowhere else.

`[x]` done · `[~]` doing · `[ ]` todo · `[!]` blocked (reason after the line)

To run a task: open a new agent chat and type `do <id>` (e.g. `do a2`), or `next A` for your lane.
Task details are in `docs/tasks/<id>.md`; you don't need to read them.

## Taimoor (lanes A, B, S, D)
- [x] A1 · Single FastAPI app
- [ ] A2 · Move the POC into `archive/poc/`
- [ ] A3 · Isolate legacy frontend screens · after A2
- [ ] S1 · SQLite decision store
- [ ] B2 · Confidence intervals in evaluation
- [ ] A5 · Clean dependencies and env · after A2
- [ ] A6 · CI workflow for this repo · after A5
- [ ] D1 · Docker deployment on a VM · after A5, S1 · *needs you: create the VM*
- [ ] B1 · Real-app QA cases · after Q4 (Abdul) · *needs you: pick the app, write labels*

## Abdul (lane Q)
- [ ] A4 · Fail-safe: step errors escalate
- [ ] Q1 · Suggested selector patch
- [ ] Q4 · `simple_rule` baseline · after B2 (Taimoor)
- [ ] Q2 · Timing NFRs in evaluation · after B2 (Taimoor)
- [ ] Q3 · `llm_judge` baseline · after Q4

## Shazil (lane C)
- [ ] C2 · Add `rerun` to the contract
- [ ] C4 · Log truncation
- [ ] C1 · CI evidence contract · after C2 · *needs you: decide the evidence groups*
- [ ] C7 · Commit tracing · after C1
- [ ] C3 · CI corpus · after C1 · *needs you: verify every label*
- [ ] C6 · Log fact extraction · after C1, C4
- [ ] C8 · `CIAdapter` in the engine · after C1, C7
- [ ] C5 · Webhook endpoint · after S1 (Taimoor)
- [ ] C9 · CI weights · after C8 · *needs you: write every number*
- [ ] C10 · CI pipeline and evaluation · after C3, C6, C9
- [ ] C11 · CI screen · after C10

## Human work for FYP-1 Final (not for AI)
- [ ] Everyone: review and rewrite `docs/spec.md` and `docs/plan.md` in your own words
- [ ] Everyone: fill your rows in `docs/disclosure.md` §2
- [ ] Abdul: check the hand calculation in `test_posterior_matches_hand_calculation`
- [ ] Everyone: rehearse a walkthrough of your own module (explain, alternatives, what breaks, how to change it)
- [ ] Report, poster, presentation
