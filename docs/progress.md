# Progress

Agent memory across sessions. Read this first in every session. Keep it under ~80 lines:
**replace** the "Now" section each session; append to "Lessons" only when something cost time;
move resolved blockers out. Task status and what's next: `TODO.md` only.
History lives in git and `docs/log/ai-usage-log.md`.

## Now
- C14 complete (2026-11-02): the CI Engine catalogue includes only corpus cases with both reviewed
  `label` and `label_source`, hides historical labels until analysis, and links safe repository/run
  metadata to GitHub. The offline demo applies the existing `default` CI policy tier to corpus runs
  whose recorded tier is `medium`, as approved by the owner; weights and evidence contract unchanged.
  Extraction failures remain distinct and show no invented facts. Verified by 12 CI tests, frontend
  lint, frontend build, and ruff. Fixture evaluation remains fixture-only.
## Blockers / questions for the team
- Supervisor scope review is pending for Q5 and C14; both are planned for the final demo.
- Team review and rewrite of `docs/spec.md` and `docs/plan.md` in members' own words; both remain
  AI-drafted working documents.
- Each member completes their rows in `docs/disclosure.md` §2, including actual AI contribution,
  human changes, verification, and one caught AI error. CI probability values were AI-proposed; do
  not call every probability human-authored.
- Do not fit or tune QA weights on evaluation results; the B3 comparison is frozen.
- D1 needs a human-created VM, Docker, an API token, and firewall setup.
- CI owner's contribution should be visible and explainable in the viva; the audit found no CI-owner
  commits on `main`. Agree how to evidence ownership without misrepresenting authorship.
- Verified: BUMP has `workflowLogs/`; Zheng/Lin Table 3 counts are recorded in the dataset survey.
  lca (`default` config, 68 cases) fixes are all code changes: lca gives `bug` only, and BUMP gives
  `dependency`. Importers ran; the human owner approved the suggestions before labels were set.
- Owner approved (2026-11-02, not yet applied): `flaky` is defined by mechanism, and `rerun` is also
  correct for transient `infra`. Apply it in C12 with an ADR 006 addendum, never earlier.
- C12 requires reviewed labels and enough cases for a
  training/holdout split disjoint from C10 benchmark cases; agents must not invent labels or claim
  results before evaluation.
- C12 is blocked (2026-11-02): the reviewed corpus has only 3 `flaky` cases. Holding out even one
  leaves at most two for fitting and produces an uninformative cause-specific evaluation; C12
  requires a meaningful holdout for every cause. Collect and human-review more `flaky` cases before
  calibration. No calibration script, weights, or holdout results were created.

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
