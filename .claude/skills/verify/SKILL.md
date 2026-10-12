---
name: verify
description: Verify TriageCore changes end-to-end — pytest (engine, browser collector, full pipeline), lint, weights validity, frontend build, and a live API run of the QA pipeline. Use after changing src/, poc_api/, tests/, or frontend/.
---

Run from the repo root. Report each step as pass or fail with the relevant output; don't hide failures.

1. **Python tests:** `.venv/bin/python -m pytest -q` (~2 min; launches headless Chromium). This covers the engine maths (`test_engine.py`), the browser evidence collector on the real dummy pages (`test_runner.py`), and the end-to-end pipeline with real weights and known renames (`test_pipeline.py`: 0 regressions let through).
2. **Lint changed Python files:** `.venv/bin/ruff check <files>`. Existing code has pre-existing findings; report only new ones.
3. **Weights:** `.venv/bin/python -m src.core.weights` must print OK. If `weights.yaml` changed, also run `.venv/bin/python -m src.core.sensitivity` and report the decision flips.
4. **Frontend** (only if `frontend/` changed): `cd frontend && npm run lint && npm run build`.
5. **Live API:**
   - Free the port with `fuser -k 8000/tcp`.
   - Start `.venv/bin/python -m uvicorn poc_api.main:app --port 8000` in the background and poll `curl -s localhost:8000/api/qa/status`.
   - Run `curl -s -X POST localhost:8000/api/qa/run -H 'Content-Type: application/json' -d '{"scenario_id":"lab_rename_crash"}'`. Expect `recommended_action: escalate`.
   - If `groq_configured` is false, every renamed step escalates with a relocation error (fail-safe). Say so explicitly; it is not a code bug.
   - Stop the server afterwards.
6. **Tests/dummy changes:** confirm that each edited page in `tests/dummy/` matches its copy in `frontend/public/` (`diff`).

Never point the real pipeline at `FixedRelocator`/`KnownRenames`; those are test stand-ins only.
