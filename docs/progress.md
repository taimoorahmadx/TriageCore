# Progress

Agent memory across sessions. Read this first in every session. Keep it under ~80 lines:
**replace** the "Now" section each session; append to "Lessons" only when something cost time;
move resolved blockers out. Task status and what's next: `TODO.md` only.
History lives in git and `docs/log/ai-usage-log.md`.

## Now
- B1 is blocked on `feature/real-app-cases`. Copied Modern TodoMVC at upstream revision
  `58e4669bd959f1b8f8c63a8b2ab6f55173f6104d`, added attribution and a query-driven mutation harness,
  and added ten owner-approved ground-truth cases. `make eval` ran the scenarios and printed these
  measured summaries before exiting 2 in the CLI printer: blind_heal 9/22 acceptable, 10/10 masked
  regressions, 0 needless escalations; penalty_rule 19/22, 0/10, 0; simple_rule 21/22, 0/10, 1;
  triagecore 22/22, 0/10, 0. The report is generated, but the check did not pass because the printer
  also iterates over the non-policy `timing` summary and raises `KeyError: 'acceptable_actions'`.
- Architecture audit 2026-10-27 found no need for a structural redesign. The main remaining evidence
  work is a fresh frozen QA comparison and a real CI corpus; C10 remains preliminary, with B3/C13
  tracking follow-up work.
- The audit also identified two unapproved contract questions: CI action semantics for `bug` and how
  to represent an unreliable/no-basis diagnosis. Keep both as blockers until the project owner and
  supervisor decide. Do not change code or weights based on a proposed option alone.

## Blockers / questions for the team
- Supervisor sign-off on the method change (X1 hard block, CI pre-rerun evidence) before FYP-1 Final.
- Project owner/supervisor decision on CI action vocabulary: `bug` → escalate or a concrete
  proposal-only action; any loss-policy change needs explicit owner approval.
- Project owner/supervisor decision on the no-reliable-diagnosis output: `unknown` classification vs
  a reliability field, plus semantics for no evidence, uniform posterior, and out-of-pattern evidence.
- Team review and rewrite of `docs/spec.md` and `docs/plan.md` in members' own words; both remain
  AI-drafted working documents.
- Each member completes their rows in `docs/disclosure.md` §2, including actual AI contribution,
  human changes, verification, and one caught AI error. CI probability values were AI-proposed; do
  not call every probability human-authored.
- C13 needs a working Groq key for a rerun; the extractor failure cause in the old artifact was not
  established. Agree who supplies the key and approves any API cost.
- B3 needs frozen labels/weights and Groq access if `llm_judge` is enabled. Do not fit or tune weights
  on evaluation or holdout results.
- B1's ten ground-truth labels were approved by the project owner on 2026-11-02; the request-failure
  mutation is simulated by a local 404. Decide whether to expand B1 scope to fix the evaluator's
  summary printer, then rerun `make eval` and review the generated report.
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
