# Progress

Agent memory across sessions. Read this first in every session. Keep it under ~80 lines:
**replace** the "Now" section each session; append to "Lessons" only when something cost time;
move resolved blockers out. Task status and what's next: `TODO.md` only.
History lives in git and `docs/log/ai-usage-log.md`.

## Now
- C3 remains blocked. The corpus contains 73 cases across 17 repositories; 45 are labeled: 41
  `infra`, 3 `flaky`, 1 `bug`, and 0 `dependency`. The newly supplied candidate report is not a
  usable dataset: its ten cited run IDs all returned HTTP 404 from the public GitHub Actions API,
  and it provides no raw logs or verified commit/attempt metadata. C3 requires at least five reviewed
  cases per cause, and the task says to stop when a cause remains below five after ten repositories.
- 2026-11-02 dataset survey: `docs/research/ci-datasets-2026-11-02.md`. Plan: `bug` + some
  `dependency` from JetBrains `lca-ci-builds-repair` (real GHA logs, fix diffs), `dependency` from
  BUMP if its repo has GHA logs, `flaky` from live mining or injected runs. C3 steps 6–10 added.
  Keep the four causes. Fix diffs and rerun outcomes are label inputs only, never engine evidence.
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
- C3 still needs at least five reviewed `bug`, `dependency`, and `flaky` cases. The user is
  preparing a dataset; the candidate IDs provided so far are unavailable via GitHub API. Need five
  accessible dependency-failure run URLs/logs (the current corpus has none). Do not assign labels
  based only on `suggested_label`.
- Before coding C3 steps 7–8, a human verifies: lca fields and lockfile-only vs src fix counts;
  whether BUMP's GitHub repo has GHA logs; Zheng/Lin Table 3 counts (for priors).
- Owner decision pending (policy, not applied): define `flaky` by mechanism, and make `rerun`
  correct for transient `infra`. Needs approval, a `changes.md` row and an ADR 006 addendum
  before any `weights.yaml` edit. Evidence in the dataset survey.
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
