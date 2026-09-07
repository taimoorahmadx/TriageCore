# TriageCore: AI QA Engineer & CI Reliability Agent

A Shared Confidence-Scoring Engine for Self-Healing Test Automation and CI Failure Triage.

**For full technical specifications, project rules, and milestone tracking, see `AGENTS.md` and `MILESTONES.md`.**

## Architecture

This is a central monorepo containing the following components:

- **src/core**: The shared confidence-scoring and failure-classification engine.
- **src/agents**: LangGraph based LLM reasoning (planner, executor, analyzer).
- **src/browser**: Playwright integration for test execution and self-healing.
- **src/ci**: Webhooks and log ingestion from GitHub Actions.
- **src/db**: Models for Postgres and Redis.

## Getting Started

### Prerequisites
- Python 3.11+
- Docker & Docker Compose

### Setup

1. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in your API keys and secrets.
   ```bash
   cp .env.example .env
   ```

2. **Start database dependencies**:
   ```bash
   docker-compose up -d
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -e ".[dev]"
   ```

3. **Install Playwright browsers**:
   ```bash
   playwright install
   ```

### Proof of Concept (POC) Demo

The POC demonstrates the core danger of "blind" AI self-healing tools and how TriageCore solves it. It uses Playwright and the Groq LLM API to attempt to click a broken button.
Prerequisite: ensure your `.env` contains a valid `GROQ_API_KEY`.

- **Scenario 1 (Safe Healing):** The script encounters a broken button ID, extracts the DOM, asks the AI for a new selector, and clicks it. The form submits successfully. The AI analyzes the post-click DOM, sees a success message, and correctly classifies it as a `SAFE_HEAL`.
  ```bash
  python3 demo_safe.py
  ```

- **Scenario 2 (Masked Regression):** The script heals the button and clicks it, just like before. However, this time, a hidden Javascript error is triggered upon clicking. A naive self-healing tool would assume success because the click physically went through. TriageCore analyzes the post-click console logs, detects the silent error, and correctly flags the action as a `MASKED_REGRESSION_ESCALATED` to prevent a false positive in the pipeline.
  ```bash
  python3 demo_trap.py
  ```

### Interactive Frontend & Live Detection API

To run the full click-through demo with live defense detection wired to the UI:

1. **Start the POC Local API**:
   ```bash
   python3 -m uvicorn poc_api.main:app --port 8000
   ```
   *Exposes `POST /api/poc/run` returning model-generated confidence scores and reasoning traces in under 6 seconds.*

2. **Start the Frontend Dashboard**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Visit `http://localhost:5173` to explore the dark dev-tool dashboard. Navigate to the QA Agent detail screen and click **"Run Live Detection"** to compute real-time triage during the presentation.*

