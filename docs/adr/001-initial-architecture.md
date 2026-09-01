# 1. Initial Architecture and Tech Stack

**Date:** 2026-09-01
**Status:** Accepted

## Context
We need to establish the foundational technology stack for TriageCore, a shared confidence-scoring engine used by a QA self-healing agent and a CI failure-triage agent. The system must support high-speed web scraping/automation, complex multi-step AI reasoning, asynchronous processing, and relational data storage.

## Decision
We have decided on the following stack:
1. **Playwright:** Chosen over Selenium for browser automation due to superior execution speed, native asynchronous support, and deep trace-level debugging contexts essential for the QA agent.
2. **LangGraph (or CrewAI):** Chosen for agent orchestration to handle complex, stateful, graph-based LLM reasoning required for multi-step triage.
3. **FastAPI:** Chosen as the webhook server for high-performance, async JSON payload processing from GitHub.
4. **Postgres:** Chosen for strict, relational, structured logging of triage decisions and evidence history.
5. **Redis:** Chosen as a job queue to background heavy LLM calls, ensuring the webhook server is never blocked.
6. **Docker:** Chosen to guarantee reproducible, containerized environments across developer laptops and cloud VMs.

## Consequences
- **Positive:** We have a modern, high-performance async architecture that fits the AI use-case perfectly.
- **Negative/Risk:** If the context window needed for CI logs exceeds standard limits, we will need to implement mid-log truncation logic in FastAPI before queuing. We are reliant on Docker for local testing of Postgres/Redis, adding slight overhead to local development setup.
