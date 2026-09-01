# AI QA Engineer & CI Reliability Agent

A Shared Confidence-Scoring Engine for Self-Healing Test Automation and CI Failure Triage.

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

1. **Start database dependencies**:
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
