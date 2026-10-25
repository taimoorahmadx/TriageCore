# 5. Iteration-1 Stack as Built (partially supersedes ADR 001)

**Date:** 2026-10-25
**Status:** Accepted (2026-10-25; decisions D5 and D6 in `docs/plan.md`)

## Context
ADR 001 chose Playwright, LangGraph (or CrewAI), FastAPI, Postgres, Redis and Docker before any
code existed. ADR 003 replaced Gemini with Groq. Iteration 1 was then built without LangGraph,
Postgres, Redis or Docker, and the documentation still described them as if they were in use.

## Decision
1. **Kept:** Playwright (sync API), FastAPI, Pydantic, Groq (ADR 003).
2. **Orchestration:** plain Python (`src/agents/qa_pipeline.py`). The QA flow is linear
   (collect → decide → score), so a graph framework adds nothing. LangGraph is reconsidered only
   if the CI agent needs branching or retries that plain code handles badly.
3. **Persistence and queue:** the engine stays pure; persistence is added through a
   `DecisionStore` adapter (ADR 004) backed by SQLite (standard `sqlite3`). Postgres only if FYP-2
   needs concurrent writers. Redis is added only when live webhooks need background work (FYP-2).
4. **Docker:** deferred until the first deployment.

## Consequences
- **Positive:** the documented stack matches the running code; fewer moving parts to explain and
  defend.
- **Negative:** M4/M5 (webhooks, queue, Postgres) still need these components; the work moves later.
- **Follow-up:** remove unused packages from `pyproject.toml` (task A5).
