# Change Log (scope, design, ownership)

Changes to scope, architecture, targets or ownership since the proposal was approved
(FAST Idea Guide §5.3). Record the change before acting on it. Format: what changed, why,
what it affects, who decided, approval status.

| # | Date | Change | Why | Affects | Decided by | Supervisor approval |
|---|---|---|---|---|---|---|
| 1 | 2026-09-02 | Primary LLM changed from Gemini to Groq (`openai/gpt-oss-20b`) | Gemini free-tier rate limits broke test runs | ADR 002 superseded by ADR 003 | Team | Not recorded |
| 2 | 2026-10-11 | Engine changed from a hand-weighted penalty score to semi-naive Bayes + minimum expected loss | Penalty sum double-counts correlated signals and does not generalise to 4 CI causes | ADR 004, M1, M7 | M2, AI-proposed | Not recorded |
| 3 | 2026-10-11 | `flaky` added as a QA cause, with a re-wait before relocation | Timing failures are a major E2E failure category | Contract use of existing enum value | M2 | Not recorded |
| 4 | 2026-10-11 | M1 implemented by M2 instead of M1 | Schedule | Ownership of M1 | Team | Not recorded |
| 5 | 2026-10-11 | Postgres persistence deferred to Iteration 2 (`DecisionStore` adapter) | Keep the engine pure and testable | M1 DoD | M2 | Not recorded |
| 6 | 2026-10-12 | `run_test` / `extract_context` became `collect_step_evidence` | One call covers extraction and post-click telemetry | M2 spec | M2 | Not needed (naming) |
| 7 | 2026-10-25 | Context files restructured (`docs/`, `reference/`, short `AGENTS.md`); `MILESTONES.md` split into `docs/roadmap.md` and `docs/log/ai-usage-log.md` | Agents were reading stale, oversized context | Documentation only, no code | Team | Not needed (docs) |
| 8 | 2026-10-25 | FYP-1 CI scope narrowed to an offline slice (labelled corpus, truncation, fact extraction, tracing, CI weights, evaluation, webhook endpoint tested with saved payloads). Live GitHub App, queue, fix PRs and live trial moved to FYP-2 | Infrastructure carries little of the CCP; keeps the shared-engine claim demonstrable in FYP-1 | M4, M5, M5.5, M6, M8 (ADR 006) | Team | To record |
| 9 | 2026-10-25 | `rerun` added to `recommended_action` for CI `flaky` | Natural autonomous action for intermittent jobs | Engine contract (ADR 006, task C2) | Team | Not needed (design) |
| 10 | 2026-10-25 | LangGraph dropped (plain Python pipelines); SQLite decision store instead of Postgres; Redis deferred | Flows are linear; fewer components to defend | ADR 001 partly superseded (ADR 005) | Team | To record |
| 11 | 2026-10-25 | `heal` returns a suggested patch and never edits test files in FYP-1 | Safety; nothing applied automatically | M3, FR-Q7 | Team | Not needed (design) |
| 12 | 2026-10-25 | Planning docs moved to the brief / spec / plan / tasks / progress set; `roadmap.md`, `requirements.md`, `architecture.md` folded in | One predictable place per kind of context for every agent | Documentation only | Team | Not needed (docs) |

| 2026-10-25 | X1 | QA hard precondition: block `heal` when `expected_state_reached` is false (ADR 004). | Project owner approved this audit fix. |
- 2026-10-26 — C3: Removed `verified_by` from corpus review records and counted cases with a label plus evidence; Shazil requested the field removal.
| 2026-10-27 | Allow provisional agent-proposed CI probability weights and add C12 dataset calibration with a predeclared holdout | Requested context change; preserve human-reviewed labels and owner approval of policy costs | Shazil |

- 2026-10-27 — Move CI weight calibration C12 to the final FYP-2 calibration stage after C10/C11; reserve final QA calibration for the same end stage and keep the initial CI benchmark on provisional weights.

- 2026-10-27 — Defer C3 real CI corpus and full benchmark to FYP-2/M7 so the FYP-1 CI branch can proceed with fixture-based initial evaluation; remove C3 as a C10 prerequisite.

- 2026-10-27 — Correct task sequencing: defer C3 and final QA/CI calibration to the end of FYP-1, after the CI implementation branch merges; keep them out of FYP-2.
