# AGENTS.md: TriageCore Global Context

## 1. Project Summary
TriageCore is a shared confidence-scoring engine used by both a QA self-healing agent and a CI failure-triage agent, not two separate tools. It classifies the root cause of pipeline failures and decides whether the system can act autonomously or must escalate to a human.

## 2. Repository Structure
The code will be physically organized as follows:
```text
triage-core/
├── src/
│   ├── core/      # ConfidenceEngine, shared models, weighting logic (weights.yaml)
│   ├── agents/    # LangGraph orchestrations (qa_agent.py, ci_agent.py)
│   ├── browser/   # Playwright runners and DOM extractors
│   ├── ci/        # FastAPI webhook server and payload truncation logic
│   └── db/        # Postgres schema definitions, Redis queues
├── tests/         # Pytest suite and benchmarking scripts
├── .env.example   # Environment placeholders
├── docker-compose.yml
└── pyproject.toml
```

## 3. Shared Contracts: ConfidenceEngine
The `ConfidenceEngine` is the core decision engine used by both agents. Its interface is strictly defined here:

**Input Schema (JSON):**
```json
{
  "evidence_type": "string",
  "source": "qa | ci",
  "raw_signals": "object",
  "context": "object"
}
```

**Output Schema (JSON):**
```json
{
  "classification": "flaky | dependency | bug | infra | stale_selector | likely_regression",
  "confidence_score": "number (0-100)",
  "reasoning_trace": "string",
  "recommended_action": "heal | escalate | auto-fix | flag"
}
```

**Explicit Notes:**
- The `classification` field is diagnosis-only (e.g., `stale_selector` / `likely_regression` for QA, `flaky`/`dependency`/`bug`/`infra` for CI). It must NEVER represent an action.
- The `recommended_action` (heal/escalate/auto-fix/flag) is the ONLY field derived by comparing `confidence_score` against a threshold. Do not conflate these two fields under any circumstances.
- The AI agent must **NOT** invent the weighting logic. The agent will generate a `weights.yaml` file with placeholder fields and comments describing what each weight represents. A human will fill in the actual mathematical values. `weights.yaml` contains separate `qa:` and `ci:` weight sections, plus a `thresholds:` section (safe default e.g. 50, empirically replaced during Milestone 7).

## 4. Tech Stack and Why
- **Browser Automation:** Playwright (not Selenium) because of its superior speed and deep trace-level debugging contexts.
- **Agent Orchestration:** LangGraph (or CrewAI) to handle complex graph-based LLM reasoning states.
- **Webhook Server:** FastAPI for high-performance async JSON processing.
- **Persistence:** Postgres for structured relational logging of triage decisions and history.
- **Job Queue:** Redis for backgrounding heavy LLM calls so webhooks don't block.
- **Deployment:** Docker to ensure reproducible environments across laptops and cloud VMs.

## 5. Environment & Secrets
The following environment variables are required. Real values live ONLY in `.env`, never in code or in this file:
- `GEMINI_API_KEY` (Primary LLM)
- `GROQ_API_KEY` (Fallback LLM)
- `GITHUB_APP_ID`
- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_TOKEN`
- `DATABASE_URL`
- `REDIS_URL`

## 6. Where Task-Specific Instructions Live
Do not treat this file as a task list. For the specific milestone you are implementing, see `MILESTONES.md`, which contains the Technical Spec, Agent Prompt, and Definition of Done for each milestone. This file (`AGENTS.md`) is stable background context; `MILESTONES.md` changes per task.
