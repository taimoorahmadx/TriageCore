# Progress

Agent memory across sessions. Read this first in every session. Keep it under ~80 lines:
**replace** the "Now" section each session; append to "Lessons" only when something cost time;
move resolved blockers out. Task status and what's next: `TODO.md` only.
History lives in git and `docs/log/ai-usage-log.md`.

## Now
- C8 is complete: CI evidence maps through `CIAdapter`, context enforces the unique-commit
  `auto-fix` precondition, and synthetic engine tests verify cause mapping, `rerun`, ambiguity
  blocking and all-null escalation. The `passed_on_rerun` outcome remains a label, not engine input.
  C3 remains paused while Shazil looks for a suitable existing dataset; its working corpus needs
  pruning and sufficient evidence for each cause label before C3 can resume.
- C6 log fact extraction is implemented in `src/ci/facts.py`: Groq output is schema-validated,
  logs are secret-masked before transmission, invalid responses get one retry, then yield empty
  facts with the error recorded.
- CI weight policy now allows explicitly tasked, provisional agent proposals; C9 covers initial
  values and owner-approved costs, while C12 fits probability tables on reviewed training cases
  and reserves a holdout for C10. C3's dataset review remains paused.
## Blockers / questions for the team
- C3 needs a suitable existing dataset or enough real cases with evidence for every cause. The
  current 61-folder working corpus must be pruned before completion; the accepted task and ADR still
  require 30–40 reviewed cases with at least five per cause. The task is paused pending dataset review.
- Supervisor sign-off on the method change (X1 hard block, CI pre-rerun evidence) before FYP-1 Final.
- Team review of `docs/spec.md` and `docs/plan.md` (AI-drafted; must be owned).
- Each member completes their rows in `docs/disclosure.md` §2.
- C9 policy costs need project-owner approval. C12 requires reviewed labels and enough cases for a
  training/holdout split; agents must not invent labels or claim results before evaluation.

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
