# TriageCore: AI QA Engineer & CI Reliability Agent

A shared confidence-scoring engine for self-healing web test automation and CI build failure triage.

> *"A shared decision engine for end-to-end software reliability. Whether a button breaks in a web test or a CI build fails on GitHub, our confidence-scoring engine decides: take automated action, or escalate to an engineer."*

---

## 1. Overview & Core Mission

Existing AI testing tools either fail to heal broken UI selectors or "blindly" force clicks without verifying post-action state—shipping critical regressions to production. Similarly, CI pipelines waste hours on flaky test reruns or risk bad automated patches when commits overlap.

**TriageCore** solves this with a centralized, shared **ConfidenceEngine** governed by strict safety invariants:
1. **QA Self-Healing Agent**: Relocates renamed or shifted DOM selectors via semantic matching. If a click triggers a silent Javascript error (`ReferenceError: processPayment is not defined`), confidence drops below the 85% safety threshold to **15% (rose red)** and immediately escalates to prevent deploying broken code.
2. **CI Reliability Agent**: Ingests GitHub Actions build logs, correlates failures against recent git commits, and decides:
   - **Flaky Infrastructure Timeout** $\rightarrow$ Dispatches automated job rerun (`flaky`, 92% confidence).
   - **Single-Author Bug** $\rightarrow$ Drafts a fix PR without merging (`bug`, 96% confidence).
   - **Overlapping Author Commits** $\rightarrow$ Flags `ambiguous_commit=true`, mathematically suppressing confidence to **15%** to block bad automated commits and escalate with a unified blame diff.
3. **Strict Invariant**: `classification` is diagnosis-only (`flaky`, `bug`, `stale_selector`, `likely_regression`). The decision to act belongs exclusively to `recommended_action` derived from threshold comparison. Autonomous merging of pull requests is strictly prohibited.

---

## 2. Architecture & Monorepo Structure

```text
TriageCore/
├── src/
│   ├── core/      # ConfidenceEngine, Pydantic models (models.py), weights contract (weights.yaml)
│   ├── agents/    # LangGraph orchestrations (qa_agent.py, ci_agent.py)
│   ├── browser/   # Playwright runners and DOM extractors
│   ├── ci/        # FastAPI webhook server and payload truncation logic
│   └── db/        # Postgres schema definitions, Redis queues
├── poc_api/       # FastAPI live detection service (main.py)
├── frontend/      # Vite + React + Tailwind dark dev-tool UI (port 5173)
├── tests/         # Pytest suite, dummy target HTMLs, and benchmark fixtures
├── docs/          # FYP presentations, troubleshooting guides, and architecture specs
├── demo_safe.py   # Standalone CLI demo: Safe DOM selector heal
├── demo_trap.py   # Standalone CLI demo: Masked regression detection
└── pyproject.toml
```

---

## 3. Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** and **npm**
- **Docker & Docker Compose** (for Postgres & Redis dependencies)

### Setup Instructions

1. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and supply your API keys (`GROQ_API_KEY`, etc.):
   ```bash
   cp .env.example .env
   ```

2. **Start Database Dependencies**:
   ```bash
   docker-compose up -d
   ```

3. **Install Python Dependencies & Playwright**:
   ```bash
   pip install -e ".[dev]"
   playwright install chromium
   ```

4. **Install Frontend Dependencies**:
   ```bash
   cd frontend && npm install && cd ..
   ```

---

## 4. Running the Interactive Demo & Proof of Concept (POC)

TriageCore includes a complete dev-tool UI connected to a live FastAPI service for live FYP presentation defense:

### Step 1: Start the Backend API
```bash
python3 -m uvicorn poc_api.main:app --host 0.0.0.0 --port 8000
```
*Exposes:*
- `POST /api/poc/run`: Executes live Playwright browser automation against target HTML, extracts DOM & console logs, and evaluates via Groq LLM.
- `POST /api/ci/triage`: Ingests GitHub Actions build failure context, parses error traces, and evaluates commit blame.

### Step 2: Start the Frontend Application
In a separate terminal:
```bash
cd frontend
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 5. UI Features & Navigation

The interface provides three grounded views designed for live defense:

### 1. Live Test & Triage (`PipelineSimulator.jsx`)
- **Tab 1: Web App Testing (QA Agent)**
  - Enter any target URL or select sample presets (`page_safe_heal.html` or `page_regression_trap.html`).
  - Open target pages in a separate browser tab to show examiners the live button and inspect console errors via DevTools (`F12`).
  - Click **Run Playwright Test & Triage** to watch live selector relocation, post-action telemetry extraction, and ConfidenceEngine evaluation (Safe 95% vs Masked Regression 15%).
- **Tab 2: CI Build Triage (CI Agent)**
  - Test realistic pipeline runs across **Network Flakes** (`redis-timeout.log`), **Single Commit Bugs** (`db-migration-syntax.log`), and **Overlapping Commits** (`tenant-conflict-ambiguous.log`).
  - Displays real GitHub Actions run telemetry, colorized failure log terminal, and git commit blame.
  - Generates draft PR #142 preview with safety banner (*Autonomous merging is strictly forbidden*).
  - Includes collapsible **Defense & Presenter Notes** for speaking points during proposal defense.

### 2. Triage History (`ReliabilityDashboard.jsx`)
- Represents the persistent **Postgres Audit Ledger** (`triage_decisions` table).
- Displays historical pipeline runs across QA and CI with calibrated scores ($\ge 85\%$ approved in green, $15\%$ in bold rose red).
- **Interactive Row Inspector**: Click any row to view the full `LLM Reasoning Trace` alongside the raw Postgres JSON record (`evidence_json`, `raw_signals`, `context`).

### 3. Benchmark - 15 Cases (`BenchmarkScreen.jsx`)
- Directly implements **Milestone 5.5** from `MILESTONES.md`.
- Evaluates Ground Truth vs. TriageCore Decision across 15 curated fixtures (7 QA + 8 CI).
- Proves the core academic claim: **0.0% False Positive Rate (FPR)** (0 regressions masked) and **93.3% Accuracy**.
- Filter by `All (15)`, `QA Browser Cases (7)`, or `CI Pipeline Cases (8)`.
- Click **Run Benchmark Suite (tests/benchmark.py)** to simulate batch fixture evaluation with animated progress.

---

## 6. Standalone CLI Demos

To execute the POC directly from the terminal without the frontend:

- **Scenario 1 (Safe Healing):**
  ```bash
  python3 demo_safe.py
  ```
  *Heals broken button ID, completes click, verifies 0 console errors, and classifies as `stale_selector` (auto-heal approved).*

- **Scenario 2 (Masked Regression Trap):**
  ```bash
  python3 demo_trap.py
  ```
  *Heals button, but catches the uncaught `ReferenceError` in browser logs, dropping confidence to 15% and escalating to prevent pipeline pollution.*

---

## 7. Milestone Roadmap & Documentation

- **`AGENTS.md`**: Global architecture, strict schemas, and shared contracts.
- **`MILESTONES.md`**: Milestone dependency graph (M1 through M8), Definition of Done, and AI Usage Log.
- **`docs/PROJECT_EXPLAINER_AND_DEFENSE_GUIDE.md`**: First-principles explainer, CCP criteria, and panel Q&A defense guide.
- **`docs/PROPOSAL_DEFENSE_PRESENTATION_GUIDE.md`**: 10-slide presentation blueprint and 2-minute live demo protocol.
- **`docs/TROUBLESHOOTING.md`**: Port conflicts, Playwright setup, and Vite debugging tips.
