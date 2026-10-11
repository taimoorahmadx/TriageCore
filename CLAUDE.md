# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Agent contracts and standing rules (follow them; they override defaults):
@AGENTS.md
@.agents/rules/project-constraints.md

## Git
- Never run `git commit` or `git push`. Print the exact commands for the user to run instead.
- Branches: `feature/...`, `bugfix/...`, `chore/...`. Commits: Conventional Commits with optional scope (`feat(poc):`, `fix(frontend):`, `docs:`).

## Running things (always from repo root — `poc_api` imports `poc_recovery` via sys.path)
- API: `python3 -m uvicorn poc_api.main:app --port 8000` (free the port with `fuser -k 8000/tcp`)
- UI: `cd frontend && npm run dev` → http://localhost:5173 (API URL `http://localhost:8000` is hardcoded in components). Lint: `npm run lint` (oxlint, not ESLint).
- PoC CLI: `python3 poc_recovery.py [suite|control|trap]` opens a **headed** browser by default. For non-interactive checks use `POST /api/poc/run` `{"scenario": "suite"}`, which runs headless.
- Python lint: `ruff check <changed files>` (config in pyproject.toml; existing code has pre-existing findings, so lint only what you touched).
- There are no tests yet (`tests/` only holds HTML fixtures). Verify with `npm run build`, lint, and a PoC run — see `/verify`.

## What's real vs scripted (don't misrepresent this)
- Real: Playwright runs against local HTML; Groq LLM is actually called (`openai/gpt-oss-20b` via a `curl` subprocess, needs `GROQ_API_KEY`).
- Scripted for the demo: suite step 3 is forced to escalate and scores are overwritten (94/96 heal, 15 escalate); `run_scenario` clamps scores; `/api/ci/triage` returns hardcoded responses; Triage History is a JS constant (no Postgres); the 50-case benchmark (96% / 0.0% FPR) is a static array in `BenchmarkScreen.jsx`.
- Keep this scripted behavior unless asked to change it, but never describe it as live, measured, or "proven" in code comments, docs, or answers.
- `src/` is mostly scaffold: only `src/core/models.py` has code. No `engine.py` / `weights.yaml` exists yet.
- Known contract drift vs AGENTS.md: `poc_api` allows `recommended_action="rerun"` and legacy classifications (`SAFE_HEAL`, `MASKED_REGRESSION_ESCALATED`). Flag it, don't silently propagate it.

## Conventions
- New LLM work targets **Groq**, not Gemini (ADR 002 is outdated on this; Gemini/Postgres/Redis/GitHub env vars are unused by current code).
- HTML targets in `tests/dummy/` are duplicated in `frontend/public/` — edit both copies.
- After non-trivial changes, add a `MILESTONES.md` AI Usage Log entry (what changed, why, what it replaced) and tick relevant DoD boxes; update README/docs if behavior changed. Skip for typo-level edits.
- Tailwind v4: `frontend/src/index.css` must keep `@config "../tailwind.config.js";`.
