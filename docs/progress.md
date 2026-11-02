# Progress

Agent memory across sessions. Read this first in every session. Keep it under ~80 lines:
**replace** the "Now" section each session; append to "Lessons" only when something cost time;
move resolved blockers out. Task status and what's next: `TODO.md` only.
History lives in git and `docs/log/ai-usage-log.md`.

## Now
- C3 is in progress. The corpus has 209 cases: 73 mined, 68 lca, and 68 BUMP. The 45 reviewed
  mined cases remain 41 `infra`, 3 `flaky`, 1 `bug`, and 0 `dependency`; every imported case still
  has `label: null` and `label_source: null` for human review. One BUMP case was skipped because
  GitHub returned 404 for its project repository; the importer also excludes records without a
  matching GitHub Actions log.
- 2026-11-02 dataset survey: `docs/research/ci-datasets-2026-11-02.md`. Fix diffs and BUMP
  `failureCategory` write `suggested_label` only; they never enter engine evidence. Imported cases
  keep `label` and `label_source` null until human review.
## Blockers / questions for the team
- Supervisor scope review is pending for Q5 and C14; both are planned for the final demo.
- Team review and rewrite of `docs/spec.md` and `docs/plan.md` in members' own words; both remain
  AI-drafted working documents.
- Each member completes their rows in `docs/disclosure.md` §2, including actual AI contribution,
  human changes, verification, and one caught AI error. CI probability values were AI-proposed; do
  not call every probability human-authored.
- B3 needs frozen labels/weights and Groq access if `llm_judge` is enabled. Do not fit or tune weights
  on evaluation or holdout results.
- D1 needs a human-created VM, Docker, an API token, and firewall setup.
- CI owner's contribution should be visible and explainable in the viva; the audit found no CI-owner
  commits on `main`. Agree how to evidence ownership without misrepresenting authorship.
- C3 still needs at least five reviewed `bug`, `dependency`, and `flaky` cases. The new lca and BUMP
  cases need human review. Do not assign labels based only on `suggested_label`.
- Verified: BUMP has `workflowLogs/`; Zheng/Lin Table 3 counts are recorded in the dataset survey.
  lca (`default` config, 68 cases) fixes are all code changes: lca gives `bug` only, and BUMP gives
  `dependency`. All three human checks are done; importers ran successfully, and imported cases
  still need human review.
- Owner approved (2026-11-02, not yet applied): `flaky` is defined by mechanism, and `rerun` is also
  correct for transient `infra`. Apply it in C12 with an ADR 006 addendum, never earlier.
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
