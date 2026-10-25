# FYP-2 Roadmap

**Status:** Plan, not tasks. Task files (`docs/tasks/<id>.md`) for FYP-2 are written at the start
of FYP-2, because their details depend on FYP-1 results (corpus size, baseline results, calibration
data). Until then, agents must not implement anything in this file.

The original proposal-stage plan is frozen at `reference/proposal-defense/MILESTONES-v1.md`; this
file replaces its FYP-2 part (M6–M8) and adds the items deferred during FYP-1 (ADR 005, ADR 006).

## Starting point (end of FYP-1)

- QA agent and ConfidenceEngine working, evaluated against baselines on team pages and a real app.
- Offline CI slice: labelled corpus, truncation, fact extraction, commit tracing, CI weights,
  CI evaluation.
- SQLite decision store, one Docker deployment on a VM, CI checks on every PR.

## M6 · Live CI and autonomous actions

Goal: close the loop on real repositories, with every action human-gated.

| Item | Done when |
|---|---|
| Live GitHub App: the webhook (FR-C1) fetches the failed run's log and commits, then queues a job | A failing run in a test repository produces a stored CI decision without manual steps |
| Background job runner (simple worker or queue; Redis only if needed, ADR 005) | Webhook still answers < 2 s; triage < 30 s (NFR-4, NFR-5) |
| CI fix PRs: the agent **opens, never merges**, a PR whose body contains `confidence_score` and `reasoning_trace` (FR-C7) | PR visible on GitHub with score and trace; no code path can merge |
| QA heal as a PR: the suggested selector patch (FR-Q7) is opened as a PR on the test repository | PR contains only the selector change |
| Dashboard of stored decisions (QA and CI), filter by source and action | Loads < 1 s with 1,000 decisions |

Safety rules stay as in `AGENTS.md` (rules 3–6). `rerun` remains a recommendation unless the team
records a decision to trigger reruns automatically.

## M7 · Benchmark and calibration (main academic contribution)

Goal: show, with evidence that is not circular, that the engine's decisions are safe and calibrated.

| Item | Done when |
|---|---|
| Larger QA benchmark: mutations of real open-source apps, labels written before runs | ≥ 59 real regression cases (needed for a one-sided 95% bound below 5% with zero misses) plus harmless and flaky cases |
| Larger CI corpus with verified labels | Enough cases per cause to report per-cause results with intervals |
| Held-out split: weights/tables are never tuned on the test cases | Split recorded before results; documented in the report |
| Calibration: learn likelihood tables from labelled counts (with smoothing) and compare with the expert tables | Report expert vs learned on the held-out split |
| Reliability check: predicted probability vs observed frequency; check the group-independence assumption | Reliability plot and a note on over/under-confidence |
| Masked-rate guarantee: report false positives (masked regressions) with confidence intervals; optionally conformal risk control (ADR 004) | Target: upper bound < 5% (NFR-6), or an honest statement of the bound reached |
| Baselines: blind heal, penalty rule, simple rule, LLM judge, and optionally a learned classifier (ADR 004 alternative) | Same metrics for every policy, including total cost under the loss table |
| Ablation: engine without risk tiers, without missing-evidence handling, without hard blocks | Shows which parts of the engine matter |

## M8 · User acceptance (required by the handbook)

Goal: real users on real repositories accept the system for its intended use.

| Item | Done when |
|---|---|
| Agents running on 2–3 consenting projects for 4 weeks (fallback: another FYP team's repository) | Consent recorded; installation done by someone outside the team |
| Acceptance log: every live decision exported with human-verified correctness, timestamp and score at decision time | CSV produced by a script from the decision store |
| Acceptance testing per the handbook: method, named participants (or declared proxies), tasks, results, issues found and fixed, acceptance decision in the participants' words, recorded session | Acceptance report written |

Plan the participants and consent **before FYP-2 Mid**, not in the final weeks.

## Handbook gates for FYP-2

| Gate | Needed |
|---|---|
| FYP-2 Mid (job-fair gate) | Integrated system (QA + CI + store + dashboard), system test report with defects by severity, evaluation running against baselines, NFRs measured not asserted |
| FYP-2 Final | Deployed system operated by someone outside the team, completed evaluation and acceptance, deployment and rollback plan rehearsed, final report with traceability and an honest limitations section, every member able to defend their modules |

## Optional improvements (only if the core is done)

- Deterministic locator ladder (role, text, structure) as a relocation fallback behind the `Relocator` interface.
- Second LLM provider behind the same interfaces.
- Visual (screenshot) matching remains out of scope unless the team records a scope change.

## Before writing FYP-2 tasks

1. Review FYP-1 results: did `simple_rule` tie the engine? How large is the CI corpus? What did the real-app cases show?
2. Record any scope changes in `docs/log/changes.md`.
3. Write task files with the template in `docs/tasks.md`, new IDs continuing each lane, and add them to `TODO.md`.
