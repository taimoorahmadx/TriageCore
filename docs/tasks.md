# Tasks (index)

Ordered vertical slices. Each task's full instructions are in `docs/tasks/<id>.md` (lowercase,
e.g. `docs/tasks/a1.md`). **One task per session.** Follow the session routine in `AGENTS.md`.

Rules for every task:
- Read this index, then only your task file, then only the files in its **Read first** list
  (plus `AGENTS.md`, `docs/progress.md`). Open others only if a step names them.
- Do exactly the **Steps**. Anything not listed is out of scope; note it in `docs/progress.md` instead.
- **Check** commands must pass with the shown result before the task is `done`. "Looks right" is not a check.
- **Every task also has two implicit checks**, even if its Check section doesn't list them:
  1. **Lint what you touched:** `.venv/bin/ruff check <changed .py files>` must pass (fix with
     `--fix` if needed); if `frontend/` changed, `cd frontend && npm run lint` must pass.
  2. **No stale references:** if you renamed, moved or deleted a file, module, route or command,
     grep the repo (excluding `reference/`, `docs/log/`, `archive/`, `node_modules/`) for the old
     name and update every remaining mention in code comments, docs and UI text. Files a later task
     will move or delete may be left; say so in the report.
- **Stop and ask** means: stop, write the question in `docs/progress.md` under Blockers, and tell the user.
- **If a Check command itself is broken** (fails because of the command or a library version, not
  because of your code): replace it in the task file with an equivalent command that verifies the
  *same* condition, run it, note the change in `progress.md`, and continue. Never weaken what a
  check verifies, and never change code just to satisfy a broken check. Stop and ask only if you
  cannot find an equivalent.
- **Status lives only in `TODO.md`** (repo root): `[~]` when you start, `[x]` when the checks pass,
  `[!]` plus a reason if blocked. Nowhere else holds task status.
- When a task completes a milestone criterion, tick it in "Milestone status" and add the evidence.
- To add a task, copy the template at the bottom into a new file, add a row to the table below, and a line to `TODO.md` under its owner.

**Task IDs:** `<lane letter><number>`, e.g. `C5`. The letter is the lane; the number is the next
free number in that lane (never reused, even if a task is deleted). The file name is the ID in
lowercase: `docs/tasks/c5.md`. Lanes run in parallel; tasks within a lane follow their dependencies.

| Letter | Lane | Main owner |
|---|---|---|
| A | Cleanup and repository setup | Taimoor |
| B | Benchmarks and evaluation | Taimoor |
| C | CI agent | Shazil |
| D | Deployment | Taimoor |
| Q | QA agent | Abdul |
| S | Store (decision database) | Taimoor |

A new lane needs a new letter added to this table.

## Milestone status

Done-criteria from the original plan (`reference/proposal-defense/MILESTONES-v1.md`), with what is
done and the evidence. Tick a box only when the evidence column can be shown live or by a test.

### POC (proposal stage) · Abdul · done
- [x] Human alters the button's ID to simulate a break.
- [x] Control scenario heals the selector and outputs `SAFE_HEAL`.
- [x] Trap scenario detects the `ReferenceError` and outputs `MASKED_REGRESSION_ESCALATED`.
- [x] Wrapped in a FastAPI service exposing `POST /api/legacy/poc/run`.
- [x] LLM returns `confidence_score` and `reasoning_trace` as JSON.
- [x] React + Tailwind demo frontend.
- [x] "Run Live Detection" button wired to `/api/legacy/poc/run`.
- Note: the POC's scores were partly hardcoded (96/94/15, forced step-3 escalation, fallback to the known selector). Replaced by the real engine in M1–M3.

### M1 · Confidence engine · Taimoor (implemented by Abdul) · mostly done
- [x] `weights.yaml` parsed; missing or incomplete file raises `RuntimeError`. *Evidence: `test_missing_weights_file_raises`, `test_incomplete_weights_raise`.*
- [x] Input and output schemas match the contract. *Evidence: `test_outputs_validate_against_contract`.*
- [x] Human-authored QA weights (64 values) with reasons. *Evidence: `src/core/weights.yaml`, `docs/contracts/weights_elicitation.md`, `make sensitivity`.*
- [ ] Correct score and classification on 5 hand-written cases. *28 engine tests pass on synthetic weights; the hand-computed posterior in `test_posterior_matches_hand_calculation` still needs a human check.*
- [x] Decisions persisted. *Evidence: `tests/test_store.py`; live `/api/qa/run` created three rows returned by `/api/qa/decisions`.* → task **S1** (SQLite instead of Postgres, ADR 005).

### M2 · Browser evidence collector · Abdul · done
- [x] 3+ failing test scripts trigger extraction without crashing. *Evidence: 12 tests in `tests/test_runner.py`.*
- [x] Extracted JSON matches the expected structure. *Evidence: `docs/contracts/raw_signals.md`, consumed by the engine.*
- [ ] DOM extraction < 500 ms measured. → task **Q2**.

### M3 · QA agent · Abdul · mostly done
- [x] Agent passes the payload to the ConfidenceEngine and receives a valid decision. *Evidence: `tests/test_pipeline.py`, `POST /api/qa/run`.*
- [x] LLM proposes a valid selector for 3+ distinct cases. *Evidence: `results/qa_eval_latest.json` (Groq run, 2026-10-20): a usable selector proposed for all 11 renamed steps.*
- [x] Evaluation against baselines: 12/12 acceptable, 0/4 regressions let through; blind healing let 4/4 through. *Evidence: `make eval`; small team-built suite, see plan §9.*
- [x] LangGraph decision: not used (ADR 005).
- [x] Step errors escalate instead of failing. *Evidence: `test_step_error_escalates`; errors and remaining scenario steps are reported as fail-safe escalations.* → task **A4**.
- [x] Suggested patch for healed steps. *Evidence: `test_selector_patch_changes_only_the_matching_line`; QA step card labels the diff "Suggested patch (not applied)".* → task **Q1**.
- [ ] Heal cycle < 10 s measured as p95. → task **Q2**.

### M4 · CI ingestion · Shazil · not started (scope: ADR 006)
- [ ] 3 malformed payloads return 400 without crashing. → **C5**
- [ ] Invalid signature returns 401. → **C5**
- [x] Oversized log truncated in the middle with `truncated=true`. *Evidence: `tests/test_truncate.py`.* → **C4**

### M5 · CI agent · Shazil · not started
- [x] CI evidence contract approved. *Evidence: `docs/contracts/ci_signals.md`, v1 approved by Shazil (2026-10-26).* → **C1**
- [ ] Identifies the bad commit in 3 clear cases. → **C7**, **C10**
- [x] Sets `ambiguous_commit=true` when 2 commits touch the failing file. *Evidence: `tests/test_tracing.py::test_two_matching_commits_are_ambiguous`.* → **C7**
- [ ] CI weights authored by a human. → **C9**
- [ ] CI evaluation on ≥ 30 labelled real cases. → **C3**, **C10**

### M5.5 · Preliminary benchmark and deployment · Taimoor + all · started
- [x] QA evaluation script with CSV output. *Evidence: `src/eval/evaluate.py`, `results/`.*
- [x] Confidence intervals and stronger baselines. *Evidence: B2 confidence intervals; `simple_rule` (Q4) and `llm_judge` (Q3) reported by the evaluation script; pipeline tests pass.*
- [ ] 10–15 real-world baseline cases. → **B1** (QA), **C3** (CI)
- [ ] Running on a remote machine, not localhost. → **D1**

### M6–M8 · FYP-2 · not started
- [ ] M6: agent opens (never merges) a PR with score and trace in the body; dashboard of stored decisions.
- [ ] M7: benchmark on real cases with confidence intervals; calibration script.
- [ ] M8: agents on 2–3 consenting projects for 4 weeks; acceptance CSV and report.

## Task list

Lanes (can run in parallel): **A** cleanup · **Q** QA agent · **B** evaluation · **S** store ·
**C** CI agent · **D** deployment. This table is the reference (owner, dependencies); progress is tracked in `TODO.md`.

| ID | Title | Owner | Milestone | Depends |
|---|---|---|---|---|
| [A1](tasks/a1.md) | Single FastAPI app `src/api/app.py` | Taimoor | cleanup | — |
| [A2](tasks/a2.md) | Move the POC into `archive/poc/` | Taimoor | cleanup | A1 |
| [A3](tasks/a3.md) | Isolate legacy frontend screens | Taimoor | cleanup | A2 |
| [A4](tasks/a4.md) | Fail-safe: step errors escalate | Abdul | M3 | — |
| [A5](tasks/a5.md) | Clean dependencies and env | Taimoor | cleanup | A2 |
| [A6](tasks/a6.md) | CI workflow for this repository | Taimoor | cleanup | A5 |
| [B2](tasks/b2.md) | Confidence intervals in evaluation | Taimoor | M5.5 | — |
| [Q4](tasks/q4.md) | `simple_rule` baseline | Abdul | M5.5 | B2 |
| [Q3](tasks/q3.md) | `llm_judge` baseline | Abdul | M5.5 | Q4 |
| [Q2](tasks/q2.md) | Timing NFRs in evaluation | Abdul | M3 | B2 |
| [Q1](tasks/q1.md) | Suggested selector patch | Abdul | M3 | — |
| [S1](tasks/s1.md) | SQLite decision store | Taimoor | M1 | A1 |
| [C2](tasks/c2.md) | Add `rerun` to the contract | Shazil | M5 | — |
| [C1](tasks/c1.md) | CI evidence contract | Shazil | M5 | C2 |
| [C4](tasks/c4.md) | Log truncation | Shazil | M4 | — |
| [C5](tasks/c5.md) | Webhook endpoint | Shazil | M4 | A1, S1 |
| [C7](tasks/c7.md) | Commit tracing | Shazil | M5 | C1 |
| [C3](tasks/c3.md) | CI corpus | Shazil | M5 | C1 |
| [C6](tasks/c6.md) | Log fact extraction | Shazil | M5 | C1, C4 |
| [C8](tasks/c8.md) | `CIAdapter` in the engine | Shazil | M5 | C1, C7 |
| [C9](tasks/c9.md) | CI weights (human) | Shazil | M5 | C8 |
| [C10](tasks/c10.md) | CI pipeline and evaluation | Shazil | M5 | C3, C6, C9 |
| [C11](tasks/c11.md) | CI screen | Shazil | M5 | C10 |
| [B1](tasks/b1.md) | Real-app QA cases | Taimoor | M5.5 | Q4 |
| [D1](tasks/d1.md) | Docker deployment on a VM | Taimoor | M5.5 | A5, S1 |

## Template for a new task

Create `docs/tasks/<id>.md`:

````markdown
# <ID> · <short title>
Spec: <FR/NFR IDs> · Owner: <member> · Depends: <task IDs or —>

**Goal:** one or two sentences; what is true when this is done.

**Read first:** the exact files (and line ranges if large) the agent needs. Nothing else.

**Steps**
1. Exact file paths to create or change.
2. Function signatures, models and field names, with types.
3. Behaviour rules, including what happens on bad input.
4. Tests to add: file name and the cases they cover.

**Check**
```bash
<commands>   # expected result
.venv/bin/ruff check <changed .py files>   # All checks passed
```
(plus `cd frontend && npm run lint` if the frontend changed; plus the stale-reference grep if
anything was renamed, moved or deleted)

**Done when:** the observable condition.
**Stop and ask if:** the situations where the agent must not decide alone.
````

Keep a task small enough for one session (about 5 files). Prefer an example input/output over a
paragraph of description. Never put weight values, labels or results into a task: those are human work.
