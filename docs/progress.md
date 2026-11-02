# Progress

Agent memory across sessions. Read this first in every session. Keep it under ~80 lines:
**replace** the "Now" section each session; append to "Lessons" only when something cost time;
move resolved blockers out. Task status and what's next: `TODO.md` only.
History lives in git and `docs/log/ai-usage-log.md`.

## Now
- Q5 is complete on `feature/fyp1-final-calibration`. QA Engine labels and groups the ten B1
  Modern TodoMVC scenarios, identifies the upstream app and deterministic mutations, and opens
  the selected query-mutated app through the API's `/apps/` static route. Added route/metadata
  tests; `.venv/bin/python -m pytest -q tests/test_api.py tests/test_pipeline.py` passed (9 tests).
  Frontend lint and production build passed. The reviewer-requested supervisor scope review remains
  listed below.
## Blockers / questions for the team
- Supervisor review of the additional FYP-1 demo scope (Q5, C14) remains pending; confirm before including the additions in the final demo.
- Team review and rewrite of `docs/spec.md` and `docs/plan.md` in members' own words; both remain
  AI-drafted working documents.
- Each member completes their rows in `docs/disclosure.md` §2, including actual AI contribution,
  human changes, verification, and one caught AI error. CI probability values were AI-proposed; do
  not call every probability human-authored.
- C13 needs a working Groq key for a rerun; the extractor failure cause in the old artifact was not
  established. Agree who supplies the key and approves any API cost.
- B3 needs frozen labels/weights and Groq access if `llm_judge` is enabled. Do not fit or tune weights
  on evaluation or holdout results.
- D1 needs a human-created VM, Docker, an API token, and firewall setup.
- CI owner's contribution should be visible and explainable in the viva; the audit found no CI-owner
  commits on `main`. Agree how to evidence ownership without misrepresenting authorship.
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
