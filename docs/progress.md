# Progress

Agent memory across sessions. Read this first in every session. Keep it under ~80 lines:
**replace** the "Now" section each session; append to "Lessons" only when something cost time;
move resolved blockers out. Task status and what's next: `TODO.md` only.
History lives in git and `docs/log/ai-usage-log.md`.

## Now
- S1 is complete on `feature/store`: SQLite decision and CI job tables, QA run persistence, and
  `GET /api/qa/decisions`. The focused tests and full suite pass; a live QA run returned three stored rows.
- Owner decisions 2026-10-25: no scope change, all CI stays in FYP-1; CI evidence = pre-rerun facts,
  rerun outcome = label; `heal` blocked when expected state not reached; project owner writes B1 labels
  before any run.
## Blockers / questions for the team
- Supervisor sign-off on the method change (X1 hard block, CI pre-rerun evidence) before FYP-1 Final.
- C1 design gap: `QAAdapter`-style `blocked_actions(raw_signals)` cannot see `context`, where the C1
  draft puts `ambiguous_commit`/`attributed_commit`. Decide in C1 (audit Q1).
- Team review of `docs/spec.md` and `docs/plan.md` (AI-drafted; must be owned).
- Each member completes their rows in `docs/disclosure.md` §2.
- C1 groups and C9 weights need the project owner's decisions; agents must not invent them.

## Decisions (short; full record in docs/plan.md §7 and docs/adr/)
- D1 offline CI slice for FYP-1 · D2 heal suggests a patch, never writes · D3 `rerun` added ·
  D4 expected-state marker supplied by the test author · D5 no LangGraph · D6 SQLite · D7 one `flaky` label, per-source meaning.

## Lessons (gotchas that cost time)
- `make lint` reports 5 pre-existing findings in `src/core/models.py` (A6, 2026-10-25).
- Chromium logs "Failed to load resource" for every failed request; it is excluded from
  `console_errors` so one 404 is not counted twice.
- Tailwind v4: `frontend/src/index.css` must keep `@config "../tailwind.config.js";` or the UI is unstyled.
- Pages in `tests/dummy/` are duplicated in `frontend/public/`; edit both and `diff`.
- Port 8000 busy: `fuser -k 8000/tcp`.
- Without `GROQ_API_KEY`, every renamed step escalates (fail-safe), which is expected, not a bug.
- Playwright sync API needs plain `def` FastAPI handlers (worker thread), not `async def`.
- FastAPI 0.162: `app.routes` holds `_IncludedRouter` objects without `.path`. List routes with
  `app.openapi()["paths"]` plus `getattr(r, "path", None)` for mounts.
