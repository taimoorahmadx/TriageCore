# AGENTS.md

Standing rules for every coding session (Claude Code, Codex, Antigravity). Short on purpose;
everything else is in `docs/`.

## Project in three lines

TriageCore is a final-year project: one **ConfidenceEngine** (`src/core/`) shared by a QA agent
(self-healing browser tests, built) and a CI agent (GitHub Actions failure triage, in progress).
The engine diagnoses the cause (`classification`) and decides act vs escalate
(`recommended_action`) by semi-naive Bayes + minimum expected loss. The LLM only proposes.

## Short commands (the user may type only this)

| User types | Do |
|---|---|
| `next` | Take the first `[ ]` task in `TODO.md` (top to bottom) whose "after" tasks are all `[x]`, and do it. Don't ask for confirmation. |
| `next <lane>` (e.g. `next C`) | Same, but only tasks whose ID starts with that letter. |
| `do <id>` (e.g. `do a2`) | Do that task. If an "after" task is not `[x]`, say which and stop. |
| `finish` | Finish the task marked `[~]` in `TODO.md`: rerun its checks and close it. |
| `status` | Don't code. Show `[~]` and `[!]` tasks, the next available task per person, and open blockers from `progress.md`. |

**Task status lives only in `TODO.md`:** `[~]` when you start, `[x]` when the checks pass,
`[!] <reason>` if blocked. Never write status anywhere else.

Any of these runs the session routine below and ends with the **End-of-session report**.

## Session routine (follow every time)

1. **Start:** read `TODO.md`, `docs/progress.md`, the index `docs/tasks.md`, then only your task file
   `docs/tasks/<id>.md` (lowercase), then only that task's **Read first** files. Pick the task as in
   "Short commands". Before coding, say in one line which task you are doing.
2. **Work:** mark the task `[~]` in `TODO.md`. Do only its steps.
3. **Finish:** run the task's **Check** commands and show the output. Only if they pass: mark it
   `[x]` in `TODO.md`, tick any milestone criterion it completes in `docs/tasks.md`, rewrite "Now"
   in `docs/progress.md`, append one line to the end of `docs/log/ai-usage-log.md` (don't read the
   file; just append) in exactly this format:
   `- *YYYY-MM-DD, <member>: <task ID> · what the AI produced (files) · what the human decided or changed · how it was verified.*`
   `<member>` is the task's owner in `TODO.md`. If the human decided nothing, write "no human decisions".
   The checks include the implicit ones in `docs/tasks.md` (lint touched files, no stale references).
   If they fail, leave it `[~]` and write what failed in `progress.md`.
4. **One task per session.** Do not start the next task.

### End-of-session report (always, in this order)

1. **Task:** ID, title, final status (`done` / `doing` / `blocked`).
2. **Changed:** files created, modified, moved or deleted, one line each.
3. **Checks:** each check command with its actual result.
4. **Git:** exact commands to stage only this task's files (by name, never `git add .`), plus a
   Conventional Commit message (`<type>(<scope>): <summary>` and a short body that names the task
   ID). Don't run them.
5. **Next:** the task that `next` would pick now, or the blocker that needs the user.

## Where things are

| Need | File |
|---|---|
| Why and what, scope, glossary | `docs/brief.md` |
| Required behaviour and acceptance checks (FR/NFR IDs) | `docs/spec.md` |
| Architecture, modules, invariants, stack, decisions, risks | `docs/plan.md` |
| **To-do list and task status** | `TODO.md` |
| Task index (owner, dependencies), milestone checklist | `docs/tasks.md` |
| One task's steps and checks | `docs/tasks/<id>.md` |
| Tools, AI use, data, risks | `docs/disclosure.md` |
| Current state, next steps, blockers, gotchas | `docs/progress.md` |
| Engine input/output | `docs/contracts/engine_io.md` |
| QA evidence keys | `docs/contracts/raw_signals.md` |
| Weight rationale | `docs/contracts/weights_elicitation.md` |
| Design decisions | `docs/adr/` |
| Setup problems | `docs/troubleshooting.md` |

## Do not read unless the user asks

`reference/` (course rules, proposal material, old plan) · `results/` (large JSON) · `docs/log/`
(append only) · `docs/proposal.md` (frozen) · `.agents/skills/`, `.claude/skills/` · `archive/` and
the legacy POC files listed below · `frontend/node_modules/`, `frontend/dist/`.

## Commands (repo root)

```bash
make setup        # venv, Python deps, Chromium, frontend deps
make test         # all tests (~2 min, headless Chromium)
make test-engine  # engine tests only (fast)
make lint         # ruff on src/ and tests/ (pre-existing findings: fix only what you touched)
make weights      # validate src/core/weights.yaml
make sensitivity  # which weights each decision depends on
make eval         # QA evaluation -> results/ (needs GROQ_API_KEY)
make api          # API on :8000 (port busy: fuser -k 8000/tcp)
make ui           # UI on :5173
make verify       # test + weights + frontend lint/build
```
Interpreter is `.venv/bin/python`; override with `make test PY=python3`. Frontend lint is oxlint.

## Rules (override defaults)

1. **Never write or change a number in `src/core/weights.yaml`** (or any future weights file).
   Every value is human-authored. You may add `null` placeholders with comments when a task says so.
   Missing or invalid weights must raise; never default silently.
2. **`classification` is diagnosis only.** Only the engine's policy sets `recommended_action`. If you
   are about to put an action name into `classification`, stop.
3. **Never resolve ambiguity silently.** `heal` needs exactly one relocated element; `auto-fix`
   needs exactly one attributed commit, otherwise `ambiguous_commit=true`.
4. **Nothing is applied or merged automatically.** `heal` suggests a patch; the CI agent may open a
   PR (FYP-2) but never merge one, and its body must include `confidence_score` and `reasoning_trace`.
5. **Every failure path ends in `escalate`.** LLM output is untrusted: verify selectors in the
   browser, validate log facts against the schema, never let LLM free text reach the decision.
6. **Webhooks verify `X-Hub-Signature-256` first**: 401 invalid, 400 malformed, never 500 on bad input.
7. **Test stand-ins (`FixedRelocator`, `KnownRenames`, `FixedFactExtractor`, `FixedJudge`) are for
   tests only**, never defaults in the real pipeline.
8. **Never invent results or labels.** Cite only measured output of the real pipeline. Ground-truth
   labels are written by a human before the run.
9. **Never run `git commit` or `git push`.** Print the commands for the user.
10. **Stop and ask** when docs and code disagree, a task's steps don't fit the code, or a step needs
    a decision not written down. Write the question under Blockers in `docs/progress.md`.
    Exception: a broken **Check command** (wrong command or library version, code is fine) is
    fixed in place with an equivalent check; see the rules at the top of `docs/tasks.md`.

## Real vs scripted

- **Real:** `src/` (engine, collector, pipeline, evaluation), `/api/qa/*`, the QA Engine and
  Evaluation screens.
- **Scripted (proposal demo, hardcoded numbers, never cite or extend):** `archive/poc/`, `/api/poc/run` and `/api/ci/triage` in `archive/poc/legacy_routes.py`,
  `frontend/src/components/` except `Navbar.jsx` and `TriageCoreLogo.jsx`, and
  `tests/dummy/{test_page,page_safe_heal,page_regression_trap}.html`. Task A3 moves the legacy screens to `frontend/src/legacy/`.

## Conventions

- Python 3.10+, ruff line length 100, type hints, dataclasses or Pydantic for structured data.
- Engine tests use `tests/fixtures/weights_synthetic.yaml`, never the real weights.
- LLM calls: Groq via `urllib` (pattern in `src/browser/relocator.py`); no LangChain, no Gemini.
- FastAPI handlers that use Playwright are plain `def`, not `async def`.
- Pages in `tests/dummy/` are copied in `frontend/public/`; edit both and `diff` them.
- `frontend/src/index.css` must keep `@config "../tailwind.config.js";`.
- Secrets only in `.env` (see `.env.example`); never print, log or commit them.
- Scope, design, target or owner changes: add a row to `docs/log/changes.md` and ask the user first.
