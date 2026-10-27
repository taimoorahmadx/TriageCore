# TriageCore

A shared decision engine for self-healing browser tests and CI failure triage. When a test step or
a build fails, an agent collects evidence, and the **ConfidenceEngine** decides whether the system
may act on its own or must hand the failure to an engineer.

Final-year project, FAST School of Computing. Team: Taimoor Ahmad, Abdul Mohaimin, Shazil.

## The problem

AI "self-healing" test tools relocate a broken selector and click the new element. If the click
handler is itself broken, the test still passes and the bug ships. TriageCore heals only when the
evidence after the click supports it.

## Current state

| Part | State |
|---|---|
| ConfidenceEngine (`src/core/`) | Built. Bayesian diagnosis over evidence groups + minimum-expected-loss decision. QA weights are human-elicited; initial CI probability tables may be agent-proposed for the initial benchmark, with final QA/CI calibration planned for the end on reviewed datasets ([ADR 004](docs/adr/004-bayesian-confidence-engine.md)) |
| QA agent (`src/browser/`, `src/agents/`) | Built. Re-wait, Groq relocation, post-click observation, engine decision |
| Evaluation (`src/eval/`) | Built. 12 hand-built steps, three policies on the same evidence |
| CI agent (`src/ci/`) | Not started |
| Persistence, deployment | Not started |

Latest evaluation (12 steps on the team's own test pages, Groq relocation, 2026-10-20):

| Policy | Acceptable decisions | Real bugs let through |
|---|---|---|
| Blind healing | 7 / 12 | 4 / 4 |
| Simple penalty rule | 11 / 12 | 0 / 4 |
| TriageCore | 12 / 12 | 0 / 4 |

This is a small, preliminary suite built by the team; it shows the method works on known cases,
not that it generalises. See `docs/plan.md` §9.

## Quickstart

Requirements: Python 3.10+, Node.js 18+, a Groq API key.

```bash
cp .env.example .env      # set GROQ_API_KEY
make setup                # venv, Python deps, Chromium, frontend deps
make test                 # ~2 min
make api                  # terminal 1: API on http://localhost:8000
make ui                   # terminal 2: UI on http://localhost:5173
```

Without a Groq key, relocation fails and every renamed step escalates (fail-safe).

Other commands: `make test-engine`, `make lint`, `make weights`, `make sensitivity`, `make eval`,
`make verify`.

## The UI

- **QA Engine:** run a scenario in a real browser. For each step: what the browser saw, how each
  piece of evidence moves the odds, the most likely cause, and the expected cost of each action.
- **Evaluation:** run every scenario and compare blind healing, a penalty rule and TriageCore.
- **Proposal PoC (scripted):** the proposal-defense demo, kept for reference. Its numbers are
  hardcoded and are not results.

## API (`/api/qa`)

| Route | Purpose |
|---|---|
| `GET /status` | Engine and Groq readiness |
| `GET /engine` | QA weights and their decision thresholds |
| `GET /scenarios` | Scenarios and ground truth |
| `POST /run` `{"scenario_id": "shopflow_checkout"}` | Run one scenario live |
| `POST /evaluate` | Run all scenarios, compare policies |
| `GET /evaluation/latest` | Latest saved evaluation |

The API has no authentication; run it on localhost only.

## Documentation

- **[TODO](TODO.md)** · [Brief](docs/brief.md) · [Spec](docs/spec.md) · [Plan](docs/plan.md) · [Tasks](docs/tasks.md) · [Progress](docs/progress.md)
- [Engine contract](docs/contracts/engine_io.md) · [QA evidence contract](docs/contracts/raw_signals.md) · [ADRs](docs/adr/)
- [Contributing](docs/contributing.md) · [Troubleshooting](docs/troubleshooting.md) · [Tools, AI use and risks](docs/disclosure.md)
- [AI usage log](docs/log/ai-usage-log.md) · [Change log](docs/log/changes.md)
- Course rules and proposal-stage material: `reference/`
