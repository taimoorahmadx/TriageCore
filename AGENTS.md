# AGENTS.md

Standing rules for every coding session (Claude Code, Codex, Antigravity). Short on purpose;
everything else is in `docs/`.

## Project in three lines

TriageCore is a final-year project: one **ConfidenceEngine** (`src/core/`) shared by a QA agent
(self-healing browser tests, built) and a CI agent (GitHub Actions failure triage, in progress).
The engine diagnoses the cause (`classification`) and decides act vs escalate
(`recommended_action`) by semi-naive Bayes + minimum expected loss. The LLM only proposes.

## Session routine (follow every time)

1. **Start:** read `docs/progress.md`, then the index `docs/tasks.md`, then only your task file
   `docs/tasks/<id>.md` (lowercase), then only that task's **Read first** files. If the user gave no
   task, take the first `todo` task in their lane whose dependencies are `done`, and confirm it
   with the user.
2. **Work:** set the task's status to `doing` in the `docs/tasks.md` table. Do only its steps.
3. **Finish:** run the task's **Check** commands and show the output. Only if they pass: set the
   status to `done`, tick any milestone criterion it completes, rewrite "Now" and "Next" in
   `docs/progress.md`, append one line to `docs/log/ai-usage-log.md`. If they fail, leave it
   `doing` and write what failed in `progress.md`.
4. **One task per session.** Do not start the next task.

## Where things are

| Need | File |
|---|---|
| Why and what, scope, glossary | `docs/brief.md` |
| Required behaviour and acceptance checks (FR/NFR IDs) | `docs/spec.md` |
| Architecture, modules, invariants, stack, decisions, risks | `docs/plan.md` |
| Task index, status, milestone checklist | `docs/tasks.md` |
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

## Real vs scripted

- **Real:** `src/` (engine, collector, pipeline, evaluation), `/api/qa/*`, the QA Engine and
  Evaluation screens.
- **Scripted (proposal demo, hardcoded numbers, never cite or extend):** `poc_recovery.py`,
  `demo_safe.py`, `demo_trap.py`, `/api/poc/run` and `/api/ci/triage` in `poc_api/main.py`,
  `frontend/src/components/` except `Navbar.jsx` and `TriageCoreLogo.jsx`, and
  `tests/dummy/{test_page,page_safe_heal,page_regression_trap}.html`. Tasks A2/A3 move them to
  `archive/poc/` and `frontend/src/legacy/`. `poc_api/main.py` also serves the real QA routes until A2.

## Conventions

- Python 3.10+, ruff line length 100, type hints, dataclasses or Pydantic for structured data.
- Engine tests use `tests/fixtures/weights_synthetic.yaml`, never the real weights.
- LLM calls: Groq via `urllib` (pattern in `src/browser/relocator.py`); no LangChain, no Gemini.
- FastAPI handlers that use Playwright are plain `def`, not `async def`.
- Pages in `tests/dummy/` are copied in `frontend/public/`; edit both and `diff` them.
- `frontend/src/index.css` must keep `@config "../tailwind.config.js";`.
- Secrets only in `.env` (see `.env.example`); never print, log or commit them.
- Scope, design, target or owner changes: add a row to `docs/log/changes.md` and ask the user first.
