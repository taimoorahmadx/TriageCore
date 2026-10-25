# Progress

Agent memory across sessions. Read this first in every session. Keep it under ~80 lines:
**replace** the "Now" and "Next" sections each session; append to "Lessons" only when something
cost time; move resolved blockers out. History lives in git and `docs/log/ai-usage-log.md`.

## Now
- Last session (2026-10-25): context files restructured (brief, spec, plan, tasks, progress,
  contracts, ADR 005/006). No code changed.
- Code state: QA engine, collector, pipeline, evaluation and UI work. 28 engine tests pass.
  CI side not started. POC still at the repo root (moves in A2).

## Next (by lane)
- A (Taimoor): A1 → A2 → A3 → A5 → A6
- Q (Abdul): A4, Q1 (independent) · then Q4 → Q3, Q2 after B2
- B (Taimoor): B2
- C (Shazil): C2 → C1 (needs Shazil's decisions) · C4 (independent)
- S (Taimoor): S1 after A1

## Blockers / questions for the team
- Team review of `docs/spec.md` and `docs/plan.md` (AI-drafted; must be owned).
- Each member completes their rows in `docs/disclosure.md` §2.
- C1 groups and C9 weights need Shazil's decisions; agents must not invent them.

## Decisions (short; full record in docs/plan.md §7 and docs/adr/)
- D1 offline CI slice for FYP-1 · D2 heal suggests a patch, never writes · D3 `rerun` added ·
  D4 expected-state marker supplied by the test author · D5 no LangGraph · D6 SQLite · D7 one `flaky` label, per-source meaning.

## Lessons (gotchas that cost time)
- Chromium logs "Failed to load resource" for every failed request; it is excluded from
  `console_errors` so one 404 is not counted twice.
- Tailwind v4: `frontend/src/index.css` must keep `@config "../tailwind.config.js";` or the UI is unstyled.
- Pages in `tests/dummy/` are duplicated in `frontend/public/`; edit both and `diff`.
- Port 8000 busy: `fuser -k 8000/tcp`.
- Without `GROQ_API_KEY`, every renamed step escalates (fail-safe), which is expected, not a bug.
- Playwright sync API needs plain `def` FastAPI handlers (worker thread), not `async def`.
