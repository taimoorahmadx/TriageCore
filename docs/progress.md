# Progress

Agent memory across sessions. Read this first in every session. Keep it under ~80 lines:
**replace** the "Now" section each session; append to "Lessons" only when something cost time;
move resolved blockers out. Task status and what's next: `TODO.md` only.
History lives in git and `docs/log/ai-usage-log.md`.

## Now
- C9 is complete: `src/core/weights.yaml` now enables CI with provisional, documented priors and
  likelihoods, plus the single `default` loss tier approved by Shazil on 2026-10-27. These
  probabilities are assumptions, not corpus measurements; C12 will calibrate them on reviewed
  labels with a disjoint holdout. `make weights` validates the domain. Full `make test` passed after
  rerunning with localhost socket permission; sandbox restrictions blocked the initial run.
  C5 is complete: `/api/ci/webhook` verifies GitHub's HMAC signature over raw bytes before JSON
  parsing, rejects malformed inputs without 500s, and idempotently stores completed failed runs.
  Eleven focused tests pass. Starlette `TestClient` hangs even for a minimal FastAPI app with the
  installed FastAPI 0.162.0 / Starlette 1.7.0 / httpx 0.28.1 combination; tests instead invoke the
  async handler with equivalent Starlette requests. C8 is complete: CI evidence maps through
  `CIAdapter`, context enforces the unique-commit `auto-fix` precondition, and synthetic engine
  tests verify cause mapping, `rerun`, ambiguity blocking and all-null escalation. The
  `passed_on_rerun` outcome remains a label, not engine input.
  C3 is scheduled at the end of FYP-1, after the CI implementation branch is merged, while Shazil
  looks for a suitable existing dataset. It no longer blocks C10/C11. The working corpus needs
  pruning and sufficient evidence for each cause label before the full benchmark/calibration.
- C6 log fact extraction is implemented in `src/ci/facts.py`: Groq output is schema-validated,
  logs are secret-masked before transmission, invalid responses get one retry, then yield empty
  facts with the error recorded.
- CI weight policy now allows explicitly tasked, provisional agent proposals; C9 covers initial
  values and owner-approved costs. C10/C11 use those frozen provisional values for the initial
  benchmark and screen. C12 is reserved for final end-of-FYP-1 calibration after those results, using
  reviewed calibration data and a holdout not used by C10. QA calibration is also final-stage human
  work. C3 and C12 follow C10/C11 at the end of FYP-1.
## Blockers / questions for the team
- Supervisor sign-off on the method change (X1 hard block, CI pre-rerun evidence) before FYP-1 Final.
- Team review of `docs/spec.md` and `docs/plan.md` (AI-drafted; must be owned).
- Each member completes their rows in `docs/disclosure.md` §2.
- End-of-FYP-1 C3 needs a suitable dataset or enough real cases with evidence for every cause. The current
  61-folder working corpus must be pruned before completion; C3 still requires 30–40 reviewed cases
  with at least five per cause. This does not block the current implementation branch.
- C12 requires reviewed labels and enough cases for a
  training/holdout split disjoint from C10 benchmark cases; agents must not invent labels or claim
  results before evaluation.

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
