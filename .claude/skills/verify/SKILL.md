---
name: verify
description: Verify TriageCore changes end-to-end in lieu of a test suite — frontend build + lint, API health, and a headless PoC suite run. Use after changing poc_recovery.py, poc_api/, src/, or frontend/.
---

The repo has no automated tests, so verify by running the real pieces. Run everything from the repo root. Report each step as pass/fail with the relevant output; don't hide failures.

0. **Python lint** on changed `.py` files only: `ruff check <files>` (fall back to `uvx ruff` if ruff isn't installed). Existing code has pre-existing findings — only report new ones.

1. **Frontend** (skip if nothing under `frontend/` changed):
   - `cd frontend && npm run lint`
   - `cd frontend && npm run build`

2. **API** — start it in the background, then check health:
   - Free the port if needed: `fuser -k 8000/tcp`
   - `python3 -m uvicorn poc_api.main:app --port 8000` (run in background)
   - Poll `curl -s http://localhost:8000/health` until it responds (give up after ~20s and show the server log).

3. **PoC suite (headless)** — skip if no change touched `poc_recovery.py`, `poc_api/`, or `tests/dummy/`:
   - `curl -s -X POST http://localhost:8000/api/poc/run -H 'Content-Type: application/json' -d '{"scenario":"suite"}'`
   - Needs `GROQ_API_KEY` in `.env`. If it's missing or Groq fails/times out, say so explicitly rather than treating it as a code bug.
   - Expected shape: steps 1–2 heal, step 3 escalates (step 3 is forced — that's scripted, not a regression).
   - If `tests/dummy/*.html` changed, confirm the matching `frontend/public/` copy was updated too (`diff` them).

4. **CI triage stub** (only if `poc_api/` changed): POST `{"scenario": "flaky"}`, `"bug"`, `"ambiguous"` to `/api/ci/triage` and confirm each returns 200.

5. Stop the background API server when done.

Do not use `python3 poc_recovery.py` directly — it opens a headed browser.
