# FYP Milestones & AI Usage Log: TriageCore

This document acts as the single source of truth for our project roadmap, gating requirements, and AI transparency logs. Any team member should be able to open it and know exactly what to build, in what order, with what interfaces, and how to verify it is done.

---

## 1. Global Context & Contracts
**See `AGENTS.md` for Shared Contracts, Repository Structure, Tech Stack, and Environment Variables.**

## 2. Milestone Dependency Graph
- **Pre-Milestone (POC)**: Blocks nothing, but must be completed before M1 for the proposal defense.
- **M1 (Engine)**: Blocks M3, M5, M7.
- **M2 (Browser)**: Blocks M3.
- **M3 (QA Agent)**: Depends on M1 + M2. Blocks M5.5.
- **M4 (CI Integration)**: Blocks M5.
- **M5 (CI Agent)**: Depends on M1 + M4. Blocks M5.5, M6.
- **M5.5 (Baseline)**: Depends on M3 + M5. Blocks FYP-II.
- **M6 (Auto-Fix PRs)**: Depends on M5.
- **M7 (Full Benchmark)**: Depends on M1 + M3 + M5 + M5.5. Blocks M8.
- **M8 (Acceptance)**: Depends on M6 + M7.

---

## 3. Phase 1: FYP-I (End-to-End System & Preliminary Baseline)

### Pre-Milestone: Proposal-Stage POC
- **Goal:** Prove the system can heal broken selectors *and* detect when a healed click masks a real regression (the core CCP claim).
- **Depends on:** Nothing.
- **Owner:** Member 2 (QA + Browser)
- **Non-Functional Targets:** Must recover the selector and classify the outcome in < 10 seconds.
- **Technical Spec:** A standalone Playwright script that visits `tests/dummy/test_page.html` across two scenarios (Control vs. Trap). When the button's ID is manually changed by a human, it uses an LLM to relocate the button via semantic DOM matching, completes the click, gathers post-click evidence (DOM state and console errors), and uses the LLM to classify the final outcome as `SAFE_HEAL` or `MASKED_REGRESSION_ESCALATED`.
- **Agent Prompt:** "Create a standalone Playwright script `poc_recovery.py`. It should load `tests/dummy/test_page.html` (use file:// absolute path) twice: once normally (`?scenario=control`) and once as a trap (`?scenario=trap`). Click the button with ID 'submit-btn'. If the selector fails, extract the surrounding DOM, send it to the LLM (using Groq via raw curl with `openai/gpt-oss-20b`) to find the new selector, and retry the click. CRITICAL: After the click, extract the browser console logs and any changes to the DOM. Send this post-click evidence to the LLM to classify if the heal was safe (`SAFE_HEAL`) or if it masked a broken javascript handler (`MASKED_REGRESSION_ESCALATED`). Catch Playwright TimeoutErrors explicitly."
- **Definition of Done:** 
  - [x] Human alters the button's ID in the local HTML to simulate a break.
  - [x] Scenario 1 (Control): Script heals the selector, sees the success message in the DOM, and outputs `SAFE_HEAL`.
  - [x] Scenario 2 (Trap): Script heals the selector, clicks, detects the ReferenceError in the console, and correctly outputs `MASKED_REGRESSION_ESCALATED`.
- **Human Tasks:** Alter the button's ID in `test_page.html` to break the initial selector before running. Provide API keys.
- **AI Usage Log:** 
  - *AI generated `poc_recovery.py` with Playwright and UI toasts. Human verified the visual demo.*
  - *AI refactored script to bypass Langchain bugs by using raw `curl` subprocess calls.*
  - *AI pivoted API from Gemini to Groq (`gpt-oss-20b`) due to strict Gemini rate limits.*
  - *AI split execution into `demo_safe.py` and `demo_trap.py` for clear presentation separation.*
  - *AI updated prompts to request LLM reasoning traces and fixed a regex bug (`re.findall`) that allowed backticks inside reasoning text to break extraction.*

### Milestone 1: The Core Confidence-Scoring Engine (The Brain)
- **Goal:** Build the central shared logic that decides if evidence is strong enough to act automatically.
- **Depends on:** Nothing.
- **Owner:** Member 1 (Engine + Benchmarking)
- **Non-Functional Targets:** Max latency < 200ms per decision, Max cost < $0.01 per LLM run, Target False-Positive Rate < 5%.
- **Technical Spec:** Implement `ConfidenceEngine` in `src/core/engine.py`. It receives the Input Schema and returns the Output Schema. Classifications must be strictly limited to the enum: `flaky`, `dependency`, `bug`, `infra` (for CI), and `stale_selector`, `likely_regression` (for QA). Both the input evidence and the decision output must be persisted to Postgres (`triage_decisions` table: `id`, `run_id` (FK), `source`, `evidence_json`, `score`, `classification`, `timestamp`). It must load weights from `weights.yaml` (which must contain separate `qa:` and `ci:` sections, and a `thresholds:` section with a safe provisional default e.g. 50) and fail loudly (raise `RuntimeError`) if missing or incomplete. Enforce types using the Pydantic classes provided in `src/core/models.py`.
- **Agent Prompt:** "Implement `ConfidenceEngine` in `src/core/engine.py` following the Shared Contracts. Enforce strict typing using the `ConfidenceEngineInput` and `ConfidenceEngineOutput` Pydantic models from `src/core/models.py`. Read weighting logic from `weights.yaml` (expecting separate `qa:` and `ci:` sections, plus a `thresholds:` section); if missing or incomplete, raise a `RuntimeError`—do not default. Generate the Postgres schema in `src/db/models.py` including `triage_decisions` with a foreign key to the agent run. Explicitly do NOT invent the mathematical weights; generate a `weights.yaml` with placeholder comments for a human to fill, including a safe default threshold (e.g. 50)."
- **Definition of Done:**
  - [ ] `weights.yaml` is parsed; missing file crashes the app instantly.
  - [ ] Engine returns a 0-100 score matching expected classification for 5 hand-written test cases.
  - [ ] Input and Output schemas match the contract exactly.
  - [ ] Decision successfully persists to Postgres `triage_decisions` table.
- **Human Tasks:** Member 1 must *design the mathematical weighting logic* and fill in `weights.yaml`. Define Postgres schema limits. Start sourcing 10-15 real-world failures.
- **AI Usage Log Template:** 
  - *Example: AI authored `src/core/engine.py` class structure; human authored the mathematical values in `weights.yaml` and verified Postgres schema types.*

### Milestone 2: Browser Automation Execution Layer
- **Goal:** Establish the raw Playwright execution layer before AI is attached.
- **Depends on:** Nothing.
- **Owner:** Member 2 (QA + Browser)
- **Non-Functional Targets:** DOM extraction must complete in < 500ms.
- **Technical Spec:** Implement `src/browser/runner.py`. Function `run_test(script_path)` executes a test. On failure, `extract_context(page, selector)` extracts immediate DOM, roles, and position, returning structured JSON matching the ConfidenceEngine's `raw_signals`.
- **Agent Prompt:** "Create `src/browser/runner.py` with `run_test` and `extract_context`. Run tests against the dummy HTML files in `tests/dummy/`. On Playwright failure, extract the immediate parent/child DOM of the failed selector and its structural position. Return this as structured JSON matching the `ConfidenceEngineInput.raw_signals` model from `src/core/models.py`. Handle `playwright.TimeoutError` and `playwright.TargetClosedError` gracefully."
- **Definition of Done:**
  - [ ] 3 failing test scripts correctly trigger extraction without crashing.
  - [ ] Extracted JSON matches the expected structure.
- **Human Tasks:** Create dummy HTML pages in `tests/dummy/` and attach them to the chat context before running the prompt. Ensure Playwright installs correctly.
- **AI Usage Log Template:** 
  - *Example: AI generated Playwright extraction logic; human wrote the dummy HTML targets and verified the extracted JSON structure.*

### Milestone 3: The AI QA Agent (Self-Healing)
- **Goal:** Connect the browser layer to the confidence engine via LangGraph to enable self-healing.
- **Depends on:** M1, M2.
- **Owner:** Member 2 (QA + Browser)
- **Non-Functional Targets:** Full heal cycle < 10 seconds.
- **Technical Spec:** `qa_agent.py` uses LangGraph. Node 1: Receive Playwright failure. Node 2: LLM proposes new selector. Node 3: Call `ConfidenceEngine`. State schema includes the proposed selector and the engine's score. (Note: The threshold for self-healing is provisional until FYP-II).
- **Agent Prompt:** "Build `src/agents/qa_agent.py` using LangGraph. The agent receives extracted DOM JSON, uses the `langchain-google-genai` package with `ChatGoogleGenerativeAI` models to propose a new selector, formats the data to the ConfidenceEngine Input Schema, and calls the engine. Return the engine's Output Schema. Explicitly do NOT invent the ConfidenceEngine interface; use the imported one."
- **Definition of Done:**
  - [ ] Agent successfully passes payload to ConfidenceEngine and receives a valid score.
  - [ ] LLM proposes a valid selector for 3 distinct test cases.
- **Human Tasks:** Review early outputs for hallucinations. Set initial provisional threshold.
- **AI Usage Log Template:** 
  - *Example: AI generated LangGraph nodes; human reviewed the first 10 self-healed selectors and corrected 2 hallucinations.*

### Milestone 4: CI Integration Layer (GitHub Webhooks)
- **Goal:** Ingest, secure, and truncate raw CI data from GitHub.
- **Depends on:** Nothing.
- **Owner:** Member 3 (CI + Dashboard)
- **Non-Functional Targets:** Webhook processing < 2 seconds before queuing.
- **Technical Spec:** `src/ci/webhooks.py` runs FastAPI. Must verify `X-Hub-Signature-256`. Extracts logs. If log > context window (e.g., 16k tokens), truncate the *middle* of the log (keep head for env setup, tail for error trace) and inject a flag into the `context` JSON marking it as `truncated=true` (which Lowers confidence). Pushes to Redis.
- **Agent Prompt:** "Implement FastAPI server in `src/ci/webhooks.py`. MUST verify `X-Hub-Signature-256` using `GITHUB_WEBHOOK_SECRET`. Extract logs. If token count exceeds 16k, cut the middle of the log, retain head and tail, and add `truncated=true` to the output JSON context. Handle malformed payloads with 400 Bad Request. Push valid jobs to Redis using the `redis-py` package."
- **Definition of Done:**
  - [ ] Given 3 malformed webhook payloads, server returns 400 without crashing.
  - [ ] Invalid signature returns 401.
  - [ ] Oversized log is correctly truncated in the middle, and `truncated=true` flag is set.
- **Human Tasks:** Set up GitHub App, webhook secrets, Ngrok.
- **AI Usage Log Template:** 
  - *Example: AI wrote FastAPI webhook routing and HMAC validation; human tested with Postman and verified signature rejection.*

### Milestone 5: The CI Reliability Agent (Failure Triage)
- **Goal:** Analyze CI logs, trace to commits, and classify failures.
- **Depends on:** M1, M4.
- **Owner:** Member 3 (CI + Dashboard)
- **Non-Functional Targets:** Triage analysis < 30 seconds.
- **Technical Spec:** `src/agents/ci_agent.py`. Pops from Redis. LLM traces to a recent commit (searches the 10 most recent commits in the PR). If tie/ambiguity (multiple commits touched the same file), the agent explicitly passes `ambiguous_commit=true` in the `context` to the `ConfidenceEngine` to mathematically reduce the confidence score, rather than silently guessing.
- **Agent Prompt:** "Build `src/agents/ci_agent.py`. Pop log from Redis using `redis-py`. Use the `langchain-google-genai` package with `ChatGoogleGenerativeAI` models to trace failure to one of the 10 most recent commits (fetch commits using the `PyGithub` library). If ambiguous, set `ambiguous_commit=true` in the evidence context. Format as Input Schema and call `ConfidenceEngine`. Handle empty logs gracefully. Do NOT silently guess commits if tied."
- **Definition of Done:**
  - [ ] Agent correctly identifies the bad commit in 3 clear test cases.
  - [ ] Agent correctly sets `ambiguous_commit=true` when 2 commits touch the failing file.
- **Human Tasks:** Push broken code to dummy repo to generate real logs and attach the resulting Webhook JSON payload to the chat context.
- **AI Usage Log Template:** 
  - *Example: AI wrote Redis polling and LangGraph flow; human verified the commit search depth limit and tie-breaking logic.*

### Milestone 5.5: Preliminary Benchmark & Basic Deployment (FYP-I Gates)
- **Goal:** Prove the baseline and deployment for Final-1.
- **Depends on:** M3, M5.
- **Owner:** Member 1 (Benchmark) & All (Deployment)
- **Non-Functional Targets:** Deployment must be containerized and run remotely.
- **Technical Spec:** `tests/benchmark.py` iterates over 10-15 JSON fixtures representing real failures. Docker Compose deploys Postgres, Redis, FastAPI, and the Agents to a cloud VM.
- **Agent Prompt:** "Create `tests/benchmark.py` to loop through the JSON fixtures located in `tests/fixtures/`, pass them to the agents, and output a CSV of expected vs actual classifications. Update `docker-compose.yml` to run the QA and CI agents alongside Postgres and FastAPI."
- **Definition of Done:**
  - [ ] Benchmark script outputs a CSV with accuracy metrics for the 15 cases.
  - [ ] FastAPI, Postgres, Redis, and Agents successfully spin up on a remote Cloud VM (not localhost).
- **Human Tasks:** Finalize 10-15 JSON baseline cases, place them in `tests/fixtures/`, and attach them to the chat context. Provision the cloud VM and run the deploy.
- **AI Usage Log Template:** 
  - *Example: AI wrote Dockerfile and Compose setup; human provisioned the AWS EC2 instance and mapped ports.*

---

## 4. Phase 2: FYP-II (Full Evaluation, Calibration & Acceptance)

### Milestone 6: Auto-Fix PRs & Dashboard
- **Goal:** Close the loop with automated actions and visibility.
- **Depends on:** M5.
- **Owner:** Member 3 (CI + Dashboard)
- **Non-Functional Targets:** Dashboard load < 1s.
- **Technical Spec:** Add `open_pr(fix_code)` to `ci_agent.py`. The PR description MUST include the `confidence_score` and `reasoning_trace`. Safety rule: NEVER merge.
- **Agent Prompt:** "Add GitHub API logic (using the `PyGithub` library) to `ci_agent.py` to open a PR. SAFETY RULE: Never merge, only open. The PR body MUST strictly format the `confidence_score` and `reasoning_trace` from the engine output. Implement a FastAPI Jinja2 dashboard for the `triage_decisions` table."
- **Definition of Done:**
  - [ ] Agent successfully opens a PR on GitHub.
  - [ ] PR body visibly contains the score and trace.
  - [ ] Dashboard displays the Postgres data correctly.
- **Human Tasks:** Manually review PRs. Give feedback to the LLM prompt.
- **AI Usage Log Template:** 
  - *Example: AI authored GitHub API requests; human verified the Safety Rule against unintended merges.*

### Milestone 7: Full 50-Case Benchmark & Threshold Calibration
- **Goal:** The Academic Contribution: empirically tune thresholds based on real data.
- **Depends on:** M1, M3, M5, M5.5.
- **Owner:** Member 1 (Engine + Benchmarking)
- **Non-Functional Targets:** Achieve < 5% false-positive rate.
- **Technical Spec:** Expand `benchmark.py` to 50 cases. Add a script `calibrate_thresholds.py` that calculates the optimal confidence threshold by maximizing true positives while keeping false positives below 5%.
- **Agent Prompt:** "Expand `tests/benchmark.py` for 50 cases. Create `calibrate_thresholds.py` to ingest the CSV results and calculate the exact confidence threshold required to keep false positives strictly below 5%."
- **Definition of Done:**
  - [ ] CSV report generated for all 50 cases.
  - [ ] Script outputs a concrete recommended threshold number (e.g. 88).
- **Human Tasks:** Finish sourcing 50 real-world failures. Use the ROC curve/FPR to empirically derive the threshold for the FYP defense.
- **AI Usage Log Template:** 
  - *Example: AI generated CSV parsing and math logic; human verified the FPR calculation formula was academically sound.*

### Milestone 8: Real User Acceptance Testing
- **Goal:** Validate the system in the real world.
- **Depends on:** M6, M7.
- **Owner:** Member 1 (Lead Acceptance Evidence Write-up), Member 2 & 3 (Deployment Support)
- **Non-Functional Targets:** 4-week continuous uptime on live repos.
- **Technical Spec:** Create `src/scripts/log_acceptance.py` to dump every live triage decision made during the 4-week window from Postgres into a structured CSV, including human-confirmed correctness (pass/fail), timestamp, and confidence score at decision time.
- **Agent Prompt:** "Create `src/scripts/log_acceptance.py` to query the `triage_decisions` table for all decisions made in the last 4 weeks. Join this with a human-input CSV column for 'verified_correct', and generate a final structured acceptance report."
- **Definition of Done:**
  - [ ] Agents are successfully hooked into 2-3 consenting open-source projects.
  - [ ] Logging script produces a detailed CSV of all live decisions.
  - [ ] Final acceptance report is written.
- **Human Tasks:** Secure the 2-3 target projects (TBD, to be secured by the start of FYP-II). Monitor live failures for 4 weeks. Manually verify correctness of each decision in the CSV.
- **AI Usage Log Template:** 
  - *Example: AI wrote the Postgres dumping script; human manually verified and graded the correctness of the 43 live decisions.*

---

## 5. Open Risks & Fallbacks
Before the semester starts, the team acknowledges the following risks and fallback plans:
- **Pre-Milestone:** If semantic DOM matching fails consistently, fallback to exact CSS selector fallback logic (no AI healing).
- **Milestone 1:** If the weighting math proves too complex to tune manually, fallback to a simpler flat heuristic (e.g., all signals carry equal weight).
- **Milestone 4:** If 16k context window is too small even with middle-truncation, fallback to extracting only the `stderr` stream from the webhook payload.
- **Milestone 5:** If commit tracing is consistently inaccurate due to large PRs, fallback to flagging the *entire PR* rather than attempting to isolate the specific commit.
- **Milestone 7:** If finding 50 real-world known-cause failures takes too long, fallback to injecting 25 synthetic, manually-crafted bugs into a clean repository.
- **Milestone 8:** If no consenting open-source project is secured by the FYP-II start date, fallback to acceptance testing against another FYP team's repository.
- **LLM Rate Limits:** If Google Gemini API limits (15 RPM) cause persistent failures during testing, fallback to using Groq API via `langchain-groq`.
