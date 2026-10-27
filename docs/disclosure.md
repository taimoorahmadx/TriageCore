# External Tools, AI Use and Risk Disclosure

**Status:** Draft (2026-10-25). Basis for the handbook's tool/API/GenAI disclosure sheet (Form 13)
and the report's tool and risk section. Each member must check and complete the rows for the work
they own. Detailed per-change AI records are in `docs/log/ai-usage-log.md`.

Categories follow the FAST Idea Guide §14: **support** (does not touch the contribution),
**core-assist** (contributes to a CCP-relevant part; must be justified, validated, with a fallback),
**core-replacement** (not acceptable).

## 1. External components

| Component | Used for | Category | Limitations | How its output is validated | Fallback |
|---|---|---|---|---|---|
| Groq API, model `openai/gpt-oss-20b` | QA: propose a replacement CSS selector. CI (planned): extract structured facts from logs | Core-assist | Can return wrong, ambiguous or invalid selectors; can misread logs; rate limits; external service | Selector is counted and clicked in the browser; only exactly one match can be healed. Log facts are schema-validated (enums only). The LLM never makes the decision | Relocation/extraction failure → missing evidence → escalate. Another provider can sit behind the same `Relocator` / `FactExtractor` interface |
| Playwright + Chromium | Run browser test steps; observe page errors, console, network, DOM markers | Support | Timing-sensitive; needs browser binaries | Collector tests on known pages (`tests/test_runner.py`) | — |
| FastAPI, Uvicorn, Pydantic | HTTP API, contract models | Support | — | Contract tests | — |
| PyYAML | Read weights and scenarios | Support | — | Strict validation in `weights.py` | — |
| React, Vite, Tailwind CSS, lucide-react | User interface | Support | — | Manual check, build | — |
| pytest, ruff, oxlint | Testing and linting | Support | — | — | — |
| GitHub REST API (planned, C3) | Download public workflow logs and commit file lists for the CI corpus | Support (data source) | Rate limits; logs may be incomplete | A human verifies every label | Fewer cases; injected failures, clearly marked |
| Public open-source web app (planned, B1) | Real-app QA test cases | Support (test data) | Licence must allow copying | Licence checked and kept with the copy | Team-built pages only |

**Not external:** the ConfidenceEngine (evidence model, decision policy, weights validation),
the evidence collector, the pipelines and the evaluation are the team's own design and code.
Removing Groq would not remove the contribution: relocation could be replaced by a deterministic
locator ladder and the engine would decide the same way.

## 2. AI assistance in development

| Tool | Members | Level (handbook rubric 2.3) | Where it was used | How the team verified it |
|---|---|---|---|---|
| Claude Code | all (confirm per member) | L2 assisted development | Engine and collector code, tests, docs | Tests, code walkthrough by the owner, live runs |
| OpenAI Codex | all (confirm per member) | L2 | Code and refactoring | Tests, review |
| Google Antigravity | all (confirm per member) | L2 | Code, UI | Tests, review, visual check |
| Kiro | Taimoor | L1/L2 | Repository audit, context and planning documents | Team review of every document |
| UI skills (apple-design, anti-slop) | Taimoor | L1 | Visual styling of the frontend | Visual check |

**Human-owned decisions:** the problem and CCP framing, the choice of method (AI proposed options;
the team challenged and approved, ADR 004), every weight value (`docs/contracts/weights_elicitation.md`),
ground-truth labels, scope decisions (`docs/log/changes.md`).

**To complete by each member:** which modules you own, which parts AI generated, what you changed,
and one example where you caught and fixed an AI mistake.

## 3. Data and privacy

- Page HTML (team-built or open-source test pages) and CI logs from public repositories are sent to Groq. No personal or user data is processed.
- CI logs are masked for token-like strings before they are sent or stored (`docs/plan.md` §8).
- Secrets live only in `.env`, which is git-ignored.
- The API has no authentication by default; it is run on localhost, and a token is required when deployed (FR-A3).

## 4. Risk register

| # | Risk | Likelihood | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R1 | Groq unavailable or rate-limited during the demo | Medium | High | Fail-safe escalation; record a backup run; second provider behind the interface | Abdul | Open |
| R2 | Elicited or agent-proposed weights may be miscalibrated | Medium | High | Sensitivity analysis; fit CI probabilities on reviewed training cases and evaluate on a separate holdout (C12); keep policy costs owner-approved | Abdul (QA), Shazil (CI) | Open |
| R3 | Small, team-built evaluation overstates results | High | High | Confidence intervals (B2), stronger baselines (Q3, Q4), real-app cases (B1), honest limitations | Taimoor | Open |
| R4 | Not enough labelled CI cases per cause | Medium | Medium | More repositories; marked injected failures | Shazil | Open |
| R5 | A member cannot explain AI-generated code they own | Medium | High | Owners walk through their modules before each evaluation; one task per session keeps changes reviewable | All | Open |
| R6 | Prompt injection through page HTML or CI logs | Low | Medium | Logs and HTML treated as data; enum-only schemas; the LLM never decides | Shazil, Abdul | Open |
| R7 | Leaked secret in logs or commits | Low | High | `.env` git-ignored; masking before sending/storing logs | All | Open |
| R8 | Deployed API abused (browser launches, LLM credit) | Medium | Medium | API token (FR-A3); firewall to port 8000 only | Taimoor | Open |
