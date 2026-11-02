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
| ConfidenceEngine (`src/core/`) | Built. Bayesian diagnosis over evidence groups + minimum-expected-loss decision. QA weights are human-elicited; CI probabilities are provisional and final calibration is deferred pending more reviewed flaky cases ([ADR 004](docs/adr/004-bayesian-confidence-engine.md)) |
| QA agent (`src/browser/`, `src/agents/`) | Built. Re-wait, Groq relocation, post-click observation, engine decision, and suggested selector patches (never applied automatically) |
| QA evaluation (`src/eval/`) | Built. Frozen 22-step comparison of four policies, including confidence intervals |
| CI agent (`src/ci/`, `src/agents/`) | Built for local demos: fixture and reviewed historical GitHub Actions cases, log fact extraction, commit tracing, engine decisions, and signed webhook intake. Final weight calibration is deferred. |
| Persistence, deployment | SQLite decision and CI job storage is built. Remote deployment is not started. |

Frozen QA evaluation (22 steps, Groq relocation, 2026-11-02):

| Policy | Acceptable decisions | Real bugs let through |
|---|---|---|
| Blind healing | 9 / 22 | 10 / 10 |
| Penalty rule | 19 / 22 | 0 / 10 |
| Simple rule | 21 / 22 | 0 / 10 |
| TriageCore | 22 / 22 | 0 / 10 |

This is a small team-built suite, not evidence of generalisation. The latest CI fixture smoke check
scored 2 cases: TriageCore made 1 acceptable decision, with 0 extraction failures. It is explicitly
preliminary and is not real-world CI effectiveness evidence. See `docs/plan.md` §9 and
`docs/progress.md` for current dataset and calibration status.

## Quickstart

Requirements: Python 3.10+, Node.js 18+, a Groq API key. `GITHUB_WEBHOOK_SECRET` is needed only to
accept GitHub webhooks.

```bash
cp .env.example .env      # set GROQ_API_KEY
make setup                # venv, Python deps, Chromium, frontend deps
make test                 # ~2 min
make api                  # terminal 1: API on http://localhost:8000
make ui                   # terminal 2: UI on http://localhost:5173
```

Without a Groq key, relocation/fact extraction cannot run successfully and affected cases fail
safe by escalating.

Other commands: `make test-engine`, `make lint`, `make weights`, `make sensitivity`, `make eval`,
`make verify`.

## The UI

- **QA Engine:** run a scenario in a real browser. For each step: what the browser saw, how each
  piece of evidence moves the odds, the most likely cause, and the expected cost of each action.
- **Evaluation:** run every scenario and compare blind healing, a penalty rule and TriageCore.
- **CI Engine:** inspect fixtures and reviewed historical GitHub Actions runs, then run CI triage.
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
| `GET /decisions` | Recent persisted QA decisions |

## CI API (`/api/ci`)

| Route | Purpose |
|---|---|
| `GET /cases` | List demo fixtures and reviewed historical runs |
| `POST /run` `{"case_id": "dependency_failure"}` | Triage one case |
| `GET /evaluation/latest` | Latest preliminary fixture smoke summary |
| `POST /webhook` | Accept signed GitHub `workflow_run` webhook events; requires `GITHUB_WEBHOOK_SECRET` |

The API has no user authentication; run it on localhost only. The webhook verifies GitHub's
`X-Hub-Signature-256` signature using `GITHUB_WEBHOOK_SECRET`.

## Documentation

- **[TODO](TODO.md)** · [Brief](docs/brief.md) · [Spec](docs/spec.md) · [Plan](docs/plan.md) · [Tasks](docs/tasks.md) · [Progress](docs/progress.md)
- [Engine contract](docs/contracts/engine_io.md) · [QA evidence contract](docs/contracts/raw_signals.md) · [ADRs](docs/adr/)
- [Contributing](docs/contributing.md) · [Troubleshooting](docs/troubleshooting.md) · [Tools, AI use and risks](docs/disclosure.md)
- [AI usage log](docs/log/ai-usage-log.md) · [Change log](docs/log/changes.md)
- Course rules and proposal-stage material: `reference/`
