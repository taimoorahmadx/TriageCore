# Progress

Agent memory across sessions. Read this first in every session. Keep it under ~80 lines:
**replace** the "Now" section each session; append to "Lessons" only when something cost time;
move resolved blockers out. Task status and what's next: `TODO.md` only.
History lives in git and `docs/log/ai-usage-log.md`.

## Now
- C10 is complete: the CI pipeline runs fixture logs through truncation, secret masking, schema-validated
  fact extraction, commit attribution, and the ConfidenceEngine; errors fail safe to escalation. The
  preliminary fixture comparison reports `rerun_all`, `keyword_rule`, and `triagecore` with Wilson
  intervals and p50/p95 durations. It uses provisional C9 weights without tuning and is explicitly
  not real-world benchmark evidence; C3 reviewed-corpus evaluation remains deferred until the
  end-of-FYP-1 follow-up. `make test` passed (91 tests), and the evaluator printed its summary.
  C9 remains provisional with the default loss tier approved by Shazil on 2026-10-27. C5's webhook
  verifies signatures before parsing and idempotently stores completed failed runs; tests invoke
  the async handler directly because the installed Starlette `TestClient` hangs. C8 maps CI evidence
  through `CIAdapter`, enforces unique-commit auto-fix attribution, and keeps rerun outcome as a
  label rather than engine evidence. C5/C8 checks passed before this session.
- C6 fact extraction uses Groq, masks secrets before transmission, validates schemas and yields empty
  facts after two invalid responses. C3 remains scheduled after C10/C11 and branch merge; the
  working corpus needs pruning and enough evidence for each cause before full benchmark/calibration.

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
