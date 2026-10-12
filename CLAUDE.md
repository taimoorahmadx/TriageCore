# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Agent contracts and standing rules (follow them; they override defaults):
@AGENTS.md
@.agents/rules/project-constraints.md

## Git
- Never run `git commit` or `git push`. Print the exact commands for the user to run instead.
- Branches: `feature/...`, `bugfix/...`, `chore/...`. Commits: Conventional Commits with optional scope (`feat(poc):`, `fix(frontend):`, `docs:`).

## Running things (always from repo root, with `.venv/bin/python`)
- API: `.venv/bin/python -m uvicorn poc_api.main:app --port 8000` (free the port with `fuser -k 8000/tcp`). Real QA routes live in `src/api/qa_routes.py`.
- UI: `cd frontend && npm run dev` → http://localhost:5173 (the API's CORS allows only 5173/3000/8000). Lint: `npm run lint` (oxlint, not ESLint).
- QA pipeline CLI: `.venv/bin/python -m src.agents.qa_pipeline [scenario_id ...]`; evaluation: `.venv/bin/python -m src.eval.evaluate` (writes `results/`).
- Weights: `.venv/bin/python -m src.core.weights` (validate), `.venv/bin/python -m src.core.sensitivity` (what decisions depend on).
- Tests: `.venv/bin/python -m pytest` (~2 min; browser tests launch headless Chromium). Python lint: `.venv/bin/ruff check <changed files>` (pre-existing findings elsewhere, so lint only what you touched).

## Architecture (QA, Iteration 1)
`tests/scenarios/qa_scenarios.yaml` (ground truth) → `src/agents/qa_pipeline.py` → `src/browser/runner.py` (collects `raw_signals` per `docs/contracts/raw_signals.md`; Groq relocation in `relocator.py`) → `src/core/engine.py` (semi-naive Bayes in `evidence.py` + min-expected-loss in `decision.py`; ADR 004).
- The engine is pure (no I/O beyond `weights.yaml`). Every number in `src/core/weights.yaml` is human-authored. Never edit those values; changes go through the user and `docs/contracts/weights_elicitation.md`.
- Tests use `tests/fixtures/weights_synthetic.yaml` (synthetic) and `FixedRelocator`/`KnownRenames` stand-ins. Never use a stand-in relocator in the real pipeline (that was the PoC's hidden hardcoded fallback).
- `ci:` in weights.yaml is disabled until Iteration 2.

## What's real vs scripted (don't misrepresent this)
- Real: the QA Engine and Evaluation screens, `/api/qa/*`, the engine, the browser collector, and the evaluation.
- Scripted (legacy, labelled "Proposal PoC (scripted)" in the UI): `poc_recovery.py`, `/api/poc/run`, `/api/ci/triage`, `PipelineSimulator.jsx`, `ReliabilityDashboard.jsx`, and `BenchmarkScreen.jsx` (hardcoded 50-case/96%/0% FPR, never measured). Never cite them as results.
- Known contract drift: `poc_api` allows `recommended_action="rerun"` (not in the enum). The CI `rerun` question is open for M5 (ADR 004).

## Conventions
- New LLM work targets **Groq**, not Gemini (ADR 003). Postgres/Redis/GitHub env vars are unused by current code.
- HTML targets in `tests/dummy/` are duplicated in `frontend/public/` — edit both copies.
- After non-trivial changes, add a `MILESTONES.md` AI Usage Log entry (what changed, why, what it replaced) and tick relevant DoD boxes; update README/docs if behavior changed. Skip for typo-level edits.
- Tailwind v4: `frontend/src/index.css` must keep `@config "../tailwind.config.js";`.
