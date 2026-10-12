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

## 4. Running the QA Engine Demo (Iteration 1)

The live demo runs the real pipeline: a Chromium browser executes a test step, Groq proposes a
replacement for a broken selector, the browser records what happens after the click, and the
**ConfidenceEngine** (`src/core/`) decides from that evidence whether to auto-heal, flag the step as
flaky, or escalate to a human. No scores are hardcoded. See `docs/adr/004-bayesian-confidence-engine.md`.

### Step 0: Groq key
Put `GROQ_API_KEY=...` in `.env`. Without it, relocation fails and every renamed step escalates (fail-safe).

### Step 1: Start the Backend API
```bash
.venv/bin/python -m uvicorn poc_api.main:app --port 8000
```
QA engine routes (`src/api/qa_routes.py`):
- `GET /api/qa/status`: engine and Groq readiness
- `GET /api/qa/scenarios`: test scenarios with ground truth (`tests/scenarios/qa_scenarios.yaml`)
- `POST /api/qa/run` `{"scenario_id": "shopflow_checkout"}`: run one scenario live
- `POST /api/qa/evaluate`: run all scenarios and compare three decision approaches
- `GET /api/qa/engine`: the human-authored numbers in `src/core/weights.yaml`

### Step 2: Start the Frontend Application
```bash
cd frontend && npm run dev
```
Open `http://localhost:5173` (the API only accepts this origin).

---

## 5. UI Features & Navigation

### 1. QA Engine (live) (`frontend/src/qa/QAEngineScreen.jsx`)
Pick a scenario and run it in a real browser. Each step shows:
1. **What the browser saw**: whether the original button reappeared, Groq's proposed selector, and the click result, errors and requests;
2. **Which way each clue points**: how strongly each clue moves the odds toward "harmless rename" or "real bug";
3. **Most likely cause**: probabilities for rename / real bug / slow page;
4. **The decision**: expected cost of each action at the step's risk level, and why the cheapest one was chosen;
5. the ground-truth check and timings.

Scenarios: the ShopFlow checkout (`tests/dummy/shopflow_app.html`) and the scenario lab
(`tests/dummy/scenario_lab.html?case=...`): harmless rename, crash, handled failure, silent no-op, slow render,
console noise, a broken tracking pixel, and two look-alike buttons.

### 2. Evaluation (`frontend/src/qa/EvaluationScreen.jsx`)
Runs every scenario once and judges the same evidence with three approaches: **blind healing**, a **simple
penalty rule**, and **TriageCore**. It reports acceptable decisions, real bugs let through, needless
escalations, and where each step landed relative to the heal threshold. Results are saved to
`results/qa_eval_<timestamp>.json/.csv`. This is a small, preliminary, hand-built suite, and the results are measured, not typed in.

### 3. Proposal PoC (scripted) (`PipelineSimulator.jsx`)
The proposal-defense demo, kept for reference. Its QA scores and the entire CI tab are **scripted**. The old
"Triage History" and "Benchmark (50 cases)" screens displayed hardcoded data and were removed from the navigation.

---

## 6. Standalone CLI Demos

**QA engine (current):**
```bash
.venv/bin/python -m src.agents.qa_pipeline                 # run all scenarios, print decisions
.venv/bin/python -m src.agents.qa_pipeline lab_rename_crash  # run one scenario
.venv/bin/python -m src.eval.evaluate                      # three-approach evaluation -> results/
.venv/bin/python -m src.core.weights                       # validate weights.yaml
.venv/bin/python -m src.core.sensitivity                   # which numbers each decision depends on
.venv/bin/python -m pytest                                 # engine, browser-collector and end-to-end tests
```

**Proposal PoC (scripted, legacy):** to execute the original POC directly from the terminal:

- **Multi-Step Checkout Suite (ShopFlow App):**
  ```bash
  python3 poc_recovery.py suite
  ```
  *Runs Chromium across all 3 checkout steps (Add to Cart, Apply Promo, Pay), evaluates post-click telemetry per step, and outputs aggregated decisions (2 Healed | 1 Escalated).*

- **Scenario 1 (Safe Healing - Single Step):**
  ```bash
  python3 demo_safe.py
  ```
  *Heals broken button ID, completes click, verifies 0 console errors, and classifies as `stale_selector` (auto-heal approved).*

- **Scenario 2 (Masked Regression Trap - Single Step):**
  ```bash
  python3 demo_trap.py
  ```
  *Heals button, but catches the uncaught `ReferenceError` in browser logs, dropping confidence to 15% and escalating to prevent pipeline pollution.*

---

## 7. Milestone Roadmap & Documentation

- **`AGENTS.md`**: Global architecture, strict schemas, and shared contracts.
- **`MILESTONES.md`**: Milestone dependency graph (M1 through M8), Definition of Done, and AI Usage Log.
- **`docs/PROJECT_EXPLAINER_AND_DEFENSE_GUIDE.md`**: First-principles explainer, CCP criteria, and 5-minute elevator pitch.
- **`docs/PROPOSAL_DEFENSE_PRESENTATION_GUIDE.md`**: Authoritative 13-slide presentation blueprint, FAST Form 1 (100 Marks) rubric mapping, 2-minute live demo protocol, and panel Q&A battlecard.
- **`docs/TROUBLESHOOTING.md`**: Port conflicts, Playwright setup, and Vite debugging tips.
