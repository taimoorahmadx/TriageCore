# Architecture Diagram

TriageCore uses one shared ConfidenceEngine for two agents: a QA self-healing agent and a CI triage agent. Both paths collect evidence, group it, and use semi-naive Bayes plus minimum expected loss to decide whether to act autonomously or escalate.

## System Overview

The rendered diagram is kept in one place: [Architecture in the GitHub README](../../../../../README.md#architecture). This page provides the component details and design notes that accompany it.

## Architecture Overview

The system follows a clean flow: **Inputs → Agent Pipelines → Shared Engine → Outputs**, with the Web UI providing access to all components.

### INPUTS
- **QA Scenarios**: YAML test definitions + HTML demo pages
- **CI Logs**: GitHub Actions logs, run metadata, recent commits  
- **GitHub Webhooks**: Signed failure events (stored for future processing)

### AGENT PIPELINES

**QA Agent** (self-healing browser tests):
1. **Playwright Runner**: Retry original selector → relocate via Groq if needed → verify match → click
2. **Evidence Collector**: Capture page crashes, console errors, network failures, state markers

**CI Agent** (failure triage):
1. **Log Processor**: Truncate to context window, mask secrets (tokens, keys)
2. **Fact Extractor**: Use Groq to extract structured CILogFacts, validate against schema
3. **Commit Tracer**: Attribute failing files to specific commits (or mark ambiguous)

Both agents map their domain-specific signals into evidence groups for the shared engine.

### CONFIDENCE ENGINE

The core decision system shared by both agents:
1. **weights.yaml**: Priors, likelihoods P(evidence | cause), loss costs per risk tier
2. **Semi-naive Bayes**: Compute P(cause | evidence) using grouped evidence to avoid double-counting
3. **Min Expected Loss Policy**: Pick action minimizing expected cost; escalate always available

**QA**: `stale_selector`, `likely_regression`, `flaky` → `heal`, `flag`, `escalate`  
**CI**: `flaky`, `dependency`, `bug`, `infra` → `rerun`, `auto-fix`, `escalate`

### OUTPUTS
- **Decisions + SQLite**: Classification, recommended action, confidence score, full reasoning trace
- **Evaluation Reports**: JSON + CSV comparison vs baselines (masked regression rates, Wilson CIs)

### WEB UI & EXTERNAL SERVICES
- **React Web UI**: Three screens (QA, CI, Eval) to view/control agents and see results
- **Groq LLM**: Provides selector proposals (QA) and structured fact extraction (CI)

## Key Design Principles

1. **LLM proposes, engine decides**: Groq only suggests selectors (QA) or extracts facts (CI). The probabilistic engine makes all triage decisions.
2. **Fail-safe everywhere**: Invalid LLM output, ambiguous evidence, or errors → escalate to human.
3. **Risk-aware policy**: Same evidence can trigger `heal` on low-risk tests but `escalate` on high-risk ones.
4. **Shared core, separate adapters**: One engine serves both QA and CI via domain-specific evidence mapping.
5. **Transparent reasoning**: Every decision includes the full trace of evidence, probabilities, and expected losses.

## Technology Stack

| Area | Technology | Role |
|---|---|---|
| Frontend | React 19, Vite 8, Tailwind v4 | QA, CI, and evaluation screens |
| API | Python 3.10+, FastAPI, Uvicorn | Routes and orchestration |
| Browser | Playwright sync API, Chromium | QA evidence collection |
| Engine | Python, Semi-naive Bayes, PyYAML | Shared decision logic |
| LLM | Groq openai/gpt-oss-20b via urllib | Selector proposals + fact extraction |
| Storage | SQLite | Decision records and webhook jobs |
| Evaluation | pytest, labeled scenarios | Baseline comparison |

## Module Organization

```
src/
  core/       # ConfidenceEngine: models, weights, Bayes, policy
  browser/    # QA: Playwright runner, relocator, evidence collector
  ci/         # CI: log processing, fact extraction, commit tracing
  agents/     # QA and CI pipelines (orchestration)
  eval/       # Evaluation framework and baseline comparison
  api/        # FastAPI routes
  db/         # SQLite persistence layer
```
