# TriageCore architecture audit #2 (FYP-1), 2026-10-27

Read-only audit of `main` at `7a16adc` (merge of PR #14, `feature/ci-agent-2`). Nothing in the repo
was changed except this file. It follows up on `architecture-audit-2026-10-25.md` (called "A1" below).

Budget note: this pass was deliberately focused. Sections marked *(not verified)* were not re-read.

---

## 0. Executive verdict

**The architecture does not need a redesign.** The shared engine is genuinely domain-agnostic. It now
runs two real adapters (`QAAdapter`, `CIAdapter`), and the invariants are enforced in code. Since A1
the team closed every X-item (M4a, M5, M6, M7, S10, most of Q7) and built the whole CI lane, C1–C11.
That is a big step forward.

**The weak point has moved from "no CI" to "no evidence that CI works".**

- The only CI evaluation ever run covers **2 fixture cases** (`results/ci_eval_latest.json`).
- In both runs the LLM fact extractor returned **nothing** (`failure_kind: null`, `failing_files: []`).
  The engine therefore decided on one or zero informative groups.
- The keyword baseline scored 2/2. TriageCore scored 1/2 (one needless escalation, one wrong cause
  from a 4-way tie).
- The result is honestly labelled `preliminary_fixture_smoke`. But C10 is ticked `[x]` as "evaluation
  against baselines", and that wording oversells it.

The QA results file also predates B2/Q3/Q4 (`results/qa_eval_latest.json`, 2026-10-24, policies are
only `blind_heal`, `penalty_rule`, `triagecore`, with no CIs). So the newer baselines and CIs have
**no measured run behind them**.

**Grade-style view:**
- Engineering: strong (A-/B+).
- Method design: defensible (B+).
- Evaluation evidence: weak (C).
- Process and docs: over-built and partly inconsistent (B-).
- Overall: **pass-safe, good-grade-capable if the evidence gap is closed before the viva.**

**Top 5 before submission or viva:**
1. **Rerun the QA evaluation with all baselines and CIs.** `make eval` plus `--llm-judge`, then freeze
   the output as `results/frozen/...`. Today no number for `simple_rule` or `llm_judge` exists.
2. **Fix the CI extraction failure path, then run CI on a real (even small) corpus.** Do C3, ≥5 cases
   per cause. When the extractor fails, record it as `status: extraction_failed` and stop scoring it
   as a normal run (§4.3).
3. **Fix the `auto-fix` concept** (a design change, small). One action is "correct" for both
   `dependency` and `bug`, which means "the system can fix an application bug". That is
   indefensible and has no artefact in FYP-1 (§4.2).
4. **Fix the AI-disclosure contradiction.** `docs/disclosure.md` §2 says "every weight value" is
   human-owned. `TODO.md` B1 says "weights were AI-drafted", and the CI weights were proposed by an
   agent (C9). Fill in §2 per member and get the supervisor sign-offs listed in `TODO.md` §10.
5. **Make the CI owner's contribution visible.** `git log` authors are still only AbdulMohaimin4 (15),
   Taimoor (13) and Taimoor Ahmad (73). Shazil appears only as an approver in a YAML comment
   (`src/core/weights.yaml` ci block, line 3 of that block). The handbook's individual-grading rule
   makes this a viva risk, not a code risk.

---

## 1. Checks actually run (this audit)

| Command | Result |
|---|---|
| `make lint` | `All checks passed!` (A1: exit 2, 5 findings, now fixed) |
| `make weights` | `OK`: qa 3 causes / 5 groups / tiers low, medium, high; ci 4 causes / 4 groups / tier `default` |
| `.venv/bin/python -m pytest -q` (full suite) | **91 passed in 229.91 s** (A1: 44 tests). README says ~2 min, which is now stale. |
| `python -m src.core.sensitivity` | 12 reference cases; **0 decision flips** under ±50% single-likelihood perturbation (A1: 6 flips, all `silent_noop -> heal`) |
| `make test-engine` | Tool returned no output in this environment *(not verified separately; covered by the full run)* |

Not run: `make eval` (needs a key and costs money), frontend build, browser UI check.

---

## 2. Delta vs the 2026-10-25 audit

| A1 item | Status | Evidence |
|---|---|---|
| M1 CI ownership / scope cut | **Partial** | CI lane C1–C11 done (`TODO.md` §5–6). Scope stayed offline (D1 in `progress.md`). C5 and C11 were built rather than deferred. Still no CI-owner commits on `main`. |
| M2 CI label leakage | **Fixed** | `CIAdapter` uses pre-rerun facts only: `failure_kind`, `dependency_change`, `code_link`, `log_coverage` (`src/core/evidence.py`, `CIAdapter.group_states_spec`). There is no rerun-history group. |
| M3 non-circular QA eval | **Partial** | B2 (Wilson CIs, `src/eval/stats.py`), Q4 `simple_rule` (`src/eval/evaluate.py:54`) and Q3 `llm_judge` (`evaluate.py:113`, `src/eval/llm_judge.py`) are built. But (a) **no result file contains them**, (b) there is no `always_escalate` and no total-cost metric (`evaluate.py:69` `summarise`), (c) B1 (independent labels) is still `[ ]`. |
| M4 silent_noop fragility | **Fixed (option a)** | `QAAdapter.blocked_actions` blocks heal when `expected_state_reached is False` (`evidence.py`, first check in `blocked_actions`). Sensitivity: 0 flips. The **diagnosis is still wrong** (`silent_noop -> classification stale_selector`), which is the underlying independence issue. Report it, don't hide it. |
| M5 misleading break-even | **Fixed** | `build_trace` (`src/core/engine.py:113-136`) no longer prints a break-even. `details["thresholds"]` (L106-108) still computes `implied_threshold` for dashboards. Make sure the UI does not show it as "the rule". *(UI not verified)* |
| M6 scripted route on `/api/ci/*` | **Fixed** | `src/api/app.py:35`: legacy router is under `/api/legacy/*`. |
| M7 models docstring + lint | **Fixed** | `make lint` is green. CI still lints only changed files (`.github/workflows/ci.yml:23`). |
| M8 own the AI-drafted docs | **Open** | `docs/spec.md:2` and `docs/plan.md:2` still say "AI-written 2026-10-25". `docs/disclosure.md` §2 has placeholder "confirm per member" rows. `TODO.md` §10 items are all `[ ]`. |
| S1 sensitivity on priors/loss/floor | **Open** | `src/core/sensitivity.py` still perturbs likelihoods only, on hand-built `reference_cases` (L93). No CI sensitivity. |
| S2 `confidence_score` semantics | **Open** | `src/core/decision.py`: when escalating, it is still the P of the best *hypothetical* action (`silent_noop` shows 2, the dependency case shows 7). |
| S3 no-basis diagnosis | **Partial (documented, not fixed)** | `weights.yaml` comment now admits "classification still reports the most likely cause". Measured: `hosted_runner_timeout` gives a uniform 0.25 posterior and `classification=flaky` (dict-order tie-break, `evidence.py` `most_probable`). |
| S4 wrong-element heals | **Open** | No `correct_target` in `tests/scenarios` or `src/eval`. |
| S5 risk-tier semantics | **Open** | `docs/contracts/raw_signals.md:54` still says `high` = "irreversible step, e.g. payment". The collector clicks before deciding. CI uses a single `default` tier, which is fine. |
| S6 / A4 errors escalate | **Fixed (CI); QA not re-verified** | `src/agents/ci_pipeline.py:108-122` turns any exception into an escalate record. A4 is `[x]`; QA path *(not re-read)*. |
| S7 reproducibility metadata | **Open** | The CI report has `generated_at`, `evaluation_type` and a `weights` string, but no git SHA, weights hash or model id. `qa_eval_latest.json` is still overwritten by `POST /api/qa/evaluate` (`src/api/qa_routes.py:122`). |
| S8 CI cost semantics | **Open** | `score_case` (`ci_pipeline.py:41`) still counts `bug + rerun` as "masked". |
| S9 ablation | **Open** | Not built. |
| S10 FixedRelocator out of `src/` | **Fixed**, but the pattern repeated | `tests/fakes.py:6`. However `FixedFactExtractor` (`src/ci/facts.py:143`) and `FixedJudge` (`src/eval/llm_judge.py:80`) are new stand-ins in `src/`. Defaults are correct (`ci_pipeline.py:133` uses `GroqFactExtractor`). |
| Q7 doc/code drift | **Mostly fixed; new drift** | See §3.3. |

---

## 3. Architecture

### 3.1 Boundaries and dependency direction: OK

- `src/core` (engine, evidence, decision, weights) is pure. It makes no I/O calls (`engine.py:1-16`).
- Domain code lives in adapters (`evidence.py`). The pipelines (`src/agents/qa_pipeline.py`,
  `src/agents/ci_pipeline.py`) depend on `core`, `browser`/`ci` and `db`, never the reverse.
- The API (`src/api/*`) sits on top.
- The engine checks at start-up that each adapter's groups match the YAML (`engine.py:58-71`).

### 3.2 Is the engine genuinely shared? Yes, with three seams

1. **A1's context seam is fixed.** `blocked_actions(raw_signals, context)` (`evidence.py`, `EvidenceAdapter`)
   lets `CIAdapter` read `ambiguous_commit` and `attributed_commit` from context.
2. **`classification` has no "unknown".** With no or uniform evidence the engine still names a cause
   (S3). This is shared across both domains, so fix it once in core.
3. **Domains are hardcoded** (`source: Literal["qa","ci"]`, `models.py`). That is acceptable for
   FYP; say "two-domain" and avoid "pluggable".

### 3.3 Contract/code drift found today

- `src/core/engine.py:15-16` says "A DecisionStore adapter backed by SQLite is planned", but S1 is done (`src/db/store.py`).
- `src/agents/__init__.py:2` says "LangGraph agent orchestrations", but ADR 005 dropped LangGraph.
- `src/db/__init__.py:2` says "Postgres/Redis", but the store is SQLite.
- `docs/contracts/raw_signals.md:54` keeps the risk-tier wording (S5).
- `docs/disclosure.md` §2 ("every weight value" human-owned) contradicts `TODO.md` B1 and C9.
- README test time (~2 min) vs a measured 3 min 50 s.
- `log_coverage` is an evidence group with **identical likelihoods for every cause** (`weights.yaml`
  ci block, L30-37 of the block). By construction it can never change the posterior. Truncation is a
  data-quality fact, not cause evidence. It belongs in `blocked_actions` or the trace, not in Bayes.
  Today it only adds noise to the trace and inflates the "4 groups" count.

### 3.4 AGENTS.md invariants, verified in code

| Invariant | Where | Verdict |
|---|---|---|
| classification is diagnosis only | `engine.py:96-102` (`posterior.most_probable`); hypothesis and action enums are disjoint (validated in `weights.py`) | OK |
| only policy sets `recommended_action` | `engine.py:101` from `decision.action` | OK |
| heal needs exactly one element | `QAAdapter.blocked_actions` (0, >1, unknown and state-not-reached all block) | OK |
| auto-fix needs exactly one commit, else `ambiguous_commit` | `CIAdapter.blocked_actions`: blocks on ambiguous, unknown or missing attribution | OK |
| nothing auto-applied/merged | no write path; Q1 patch is suggest-only *(patch module not re-read)* | OK |
| every failure path escalates | CI: `ci_pipeline.py:108-122`. **Gap:** extractor failure returns empty facts (`facts.py:100,140`), and the run is then scored `status: ok` (§4.3) | Partial |
| LLM untrusted | facts are schema-validated Pydantic (`facts.py:34-36`) with `_last_json_object` parsing; secrets masked before the LLM (`ci_pipeline.py:59`) | OK |
| webhook signature first | `webhooks.py:27-32` checks HMAC with `compare_digest` before parsing (→401). Malformed → 400 (L81-83). No secret → 503. | OK (503 is reasonable; document it) |
| stand-ins not defaults | defaults are `GroqFactExtractor` / `GroqRelocator` | OK (but move them into `tests/`) |
| weights missing/invalid raise | `make weights` plus the loader | OK |

---

## 4. Method soundness (what an examiner will attack)

### 4.1 QA engine: defensible

Naive Bayes over grouped evidence with a Chow-style reject option and risk-tiered losses is a
standard, citable design. X1 turned the main fragility into a **hard precondition**, which is the
right call.

Prepare these answers:
- **"Why is silent_noop still diagnosed as stale_selector?"** The groups are not independent. Name
  this as a known limitation with the A1 numbers.
- **"Is the engine better than a rule?"** Not shown yet. On the 2026-10-24 data it beats `penalty_rule`
  on 1 of 12 steps, and `penalty_rule` cannot flag. `simple_rule` exists but has never been run. If
  `simple_rule` ties TriageCore, say so. The honest claim then becomes *"same decisions, but
  explainable, tunable by cost, and shared across domains"*. That is still a valid FYP contribution.
- **"Who wrote the labels?"** Same author and time as the weights (A1, M3). B1 is the fix.

### 4.2 CI engine: one conceptual flaw (design change recommended)

`weights.yaml` ci: `actions: { rerun: [flaky], auto-fix: [dependency, bug] }`, and `_CORRECT_ACTION`
(`ci_pipeline.py:22`) maps `bug -> auto-fix`.

- Fixing a dependency (pin or revert a lockfile) and fixing an application bug are different
  operations with very different risk.
- Claiming the agent can "auto-fix" a code bug contradicts the project's own "LLM only proposes"
  stance. In FYP-1 it produces nothing.

**Recommendation:**
- Rename to concrete, proposal-only actions: `propose-dependency-revert` (correct under
  `dependency`) and `propose-commit-revert` (correct under `bug`, requires the attributed commit).
- Or keep `auto-fix` correct only under `dependency`, and make `bug` → `escalate` with the
  attributed commit in the trace.

This is a small YAML, enum and test change. It removes the weakest claim in the CI story. It changes
policy, so the project owner approves the losses (AGENTS rule 1).

Two further CI points:
- **Losses:** wrong action 10, escalate 2. So acting needs P(correct) > 0.8 (`weights.yaml` ci loss).
  Fine, and owner-approved. But `infra` has no action at all, so the 4-cause model has only 2
  actionable causes. Say this explicitly.
- **Priors:** equal 0.25. Honest, but it means the CI posterior is pure likelihood. A uniform
  posterior currently produces a named diagnosis (S3).

### 4.3 CI evaluation is not yet evidence

Measured from `results/ci_eval_latest.json`:
- 2 cases, both with `facts = {failure_kind: null, failing_files: []}`.
- `dependency_failure`: only `dependency_change=changed` observed → P(dependency) 0.552 → escalate (needless).
- `hosted_runner_timeout`: nothing informative → uniform → `classification=flaky`, which is wrong (label `infra`).
- The likely cause is that the LLM call failed or no key was set *(not verified; `extractor.last_error`
  is not saved in the result)*. Either way, the run measured the fallback path, not the engine.

Fix:
- Put `extractor.last_error` and `status: extraction_failed` in the result.
- Exclude those cases from accuracy, or report them separately.
- Then run on C3 data.

**Circularity risk for C12:** the weights were agent-proposed, so labels and the held-out split must
be human-made before any fitting. `progress.md` already states this correctly.

---

## 5. Safety and security

- **Unauthenticated endpoints.** `POST /api/qa/run`, `POST /api/qa/evaluate` (overwrites cited
  results, spends Groq credits) and `POST /api/ci/run` (spends Groq credits) have no auth
  (`qa_routes.py:107,122`, `ci_routes.py:32`). Fine on localhost. **D1 must add the API token before
  any VM exposure.** CORS is restricted to localhost (`app.py:17-30`).
- **Webhook:**
  - Correct order and constant-time compare.
  - It stores the full payload (`webhooks.py:74`). Dedup by `delivery_id` *(not verified in `store.py`)*.
  - It uses `async def` with no Playwright, which is fine.
- **Secrets:** `mask_secrets` runs before the LLM and before the UI excerpt (`ci_pipeline.py:59-62`).
  The pattern coverage was *not verified*.
- **Prompt injection via logs/HTML:** bounded by schema validation and DOM verification. Keep it
  listed as a risk.

---

## 6. Testing and quality

- 91 tests pass (engine, collector, end-to-end, webhooks, tracing, facts, truncation, store, stats, patch, CI pipeline).
- Webhook tests exist (`tests/test_webhooks.py`, 132 lines). Signature and malformed cases were *not
  enumerated*.
- **Gaps:**
  - No test asserts that a failed extraction is reported as such (§4.3).
  - No test covers tie-breaking or uniform-posterior classification.
  - CI lint runs on changed files only (`ci.yml:23`). Run full `ruff check src tests` now that it's green.
- Stand-ins in `src/`: `FixedFactExtractor` (`src/ci/facts.py:143`) and `FixedJudge`
  (`src/eval/llm_judge.py:80`). Move them to `tests/fakes.py` as was done for `FixedRelocator`.

---

## 7. Product / UX *(source structure verified; screens not visually checked)*

- **Real screens:** `frontend/src/qa/{QAEngineScreen,EvaluationScreen,StepDecisionCard}.jsx` and
  `frontend/src/ci/CIEngineScreen.jsx`. Legacy is isolated in `frontend/src/legacy/` (10 files) and
  reached through one tab (`App.jsx:25`, `LegacyPoc`).
- **Risk:** a viva panel clicking the "simulator" tab sees polished scripted numbers.
  - For FYP-1 Final, hide that tab behind a flag or remove it from the navbar.
  - Keep the code in `archive/` for the proposal history.
- **CI screen:** with the extractor failing, the demo will show "failure_kind not observed" and an
  escalate. Rehearse the demo with a working key and a cached, frozen run as a fallback.
- **Story for examiners:** one evidence → posterior → expected loss → decision panel, identical for
  QA and CI. That is the thesis. Make both screens use the same visual component for that panel, so
  the "shared engine" claim is visible. *(Not verified whether they already do.)*

---

## 8. Direction / FYP-2 *(fyp2.md not re-read in this pass)*

The FYP-1 offline CI slice, the webhook intake and the job store are the right foundation for FYP-2
live triage. Do these **now** to avoid rework:

1. **Settle the action vocabulary (§4.2)** before any PR-opening code exists. Renaming actions later
   touches weights, enums, UI and evaluation.
2. **Add `unknown` / `diagnosis_reliable`** to the output contract now (S3). It is a contract change
   that gets more expensive with every consumer.
3. **Version results:** git SHA, weights hash, model id and prompt hash in every report (S7).
   Calibration in FYP-2 depends on knowing which weights produced which decision.
4. **Keep the SQLite store as the single decision log.** Calibration data (C12, M7) should come from
   it plus human labels, not from ad-hoc JSON files.

---

## 9. Docs and process

- ~21k words of docs (`docs/**/*.md`) vs ~3.9k lines of Python (`src/` + `tests/`). The ratio has
  improved since A1 because code grew, but the docs are still heavy.
- **Stop adding process.** Spend the remaining time on evidence (Top 5) and the report.
- **AI-usage disclosure:**
  - The structure is good: tool table, ai-usage log, changes log.
  - Content is incomplete: §2 per-member rows are not filled, and the "human-owned weights" claim is
    inaccurate.
  - For an FYP integrity review, an inaccurate disclosure is worse than a candid "AI proposed, human
    reviewed and approved on <date>".
- Supervisor approvals (method change, scope) are still open (`TODO.md` §10, `progress.md` Blockers).

---

## 10. Prioritised recommendations

Is an architecture design change needed? **No structural redesign.** Two small design changes are
recommended: (1) the CI action vocabulary (§4.2) and (2) an explicit "no reliable diagnosis" output
(S3). Both are contract-level, not module-level.

| Pri | Effort | Action | Files |
|---|---|---|---|
| P0 | S | Rerun the QA eval with `simple_rule` and `llm_judge`, with CIs. Freeze to `results/frozen/<date>_<sha>.json` and cite only frozen runs. | `src/eval/evaluate.py`, `results/` |
| P0 | S | CI: record `extractor.last_error`, add `status: extraction_failed`, report those cases separately. Rerun C10 with a working key. | `src/agents/ci_pipeline.py`, `src/eval/evaluate_ci.py`, `tests/test_ci_pipeline.py` |
| P0 | M | C3: a small, human-labelled real CI corpus (≥5 per cause). Rewrite C10's `[x]` wording to "smoke test on 2 fixtures" until C3 runs. | `tests/fixtures/ci_cases/`, `TODO.md`, `docs/tasks.md` |
| P0 | S | Fix the disclosure: who drafted which weights and labels, and who approved them and when. Fill §2 per member. Record supervisor sign-offs. | `docs/disclosure.md`, `docs/log/changes.md` |
| P0 | S (human) | CI owner presents and owns the CI modules in the viva; visible authored work or a recorded ownership change. | team |
| P1 | S | Redefine `auto-fix` (split it, or `bug → escalate`). Owner approves the losses. | `src/core/weights.yaml`, `src/core/models.py`, `src/agents/ci_pipeline.py`, tests, `docs/contracts/engine_io.md` |
| P1 | S | Add `unknown` classification or `diagnosis_reliable: false` when there is no evidence, a uniform posterior, or an unrecognised pattern. | `src/core/engine.py`, `src/core/models.py`, `engine_io.md`, UI |
| P1 | S | Add `always_escalate` and a **total expected-cost** metric to both evaluations. | `src/eval/evaluate.py`, `src/eval/evaluate_ci.py` |
| P1 | S | Remove `log_coverage` from Bayes (make it a trace note or an auto-fix blocker). | `weights.yaml`, `CIAdapter`, tests |
| P1 | S | Hide the legacy tab for the final demo. | `frontend/src/App.jsx`, `Navbar.jsx` |
| P1 | S | Add report metadata: git SHA, weights hash, model id. | `src/eval/*.py` |
| P1 | M | B1: real-app QA cases labelled by the owner before running, with frozen weights. | `tests/scenarios/` |
| P2 | S | Move `FixedFactExtractor` and `FixedJudge` to `tests/fakes.py`. | `src/ci/facts.py`, `src/eval/llm_judge.py`, `tests/` |
| P2 | S | Fix stale docstrings and docs (§3.3); fix the risk-tier wording (S5). | `engine.py`, `src/agents/__init__.py`, `src/db/__init__.py`, `raw_signals.md`, README |
| P2 | M | Extend sensitivity to priors, losses and floor, plus CI cases (S1). Add a cheap ablation (S9). | `src/core/sensitivity.py` |
| P2 | S | Full-repo lint in GitHub Actions. | `.github/workflows/ci.yml` |
| P2 | S | API token before D1; never expose `/api/*/run` or `/evaluate` publicly without it. | `src/api/*` |

---

## Plain-language summary

- Your architecture is good. Don't redesign it. One shared engine really does serve both QA and CI.
- You fixed almost everything the last audit flagged as must-fix (break-even line, legacy routes,
  lint, the silent-bug heal, CI label leakage).
- All 91 tests pass, lint is clean, and the weights validate. I ran these myself.
- The biggest problem now is **evidence, not code**.
- Your CI "evaluation" is 2 fake cases, and in both the LLM returned nothing. So it tested the
  fallback, not the engine. A simple keyword rule beat TriageCore 2–1.
- Your QA results file is older than your new baselines. `simple_rule` and `llm_judge` have never
  actually been run. Rerun and freeze the results.
- When the LLM fails, the CI pipeline quietly carries on and scores it as a normal run. Make it say
  "extraction failed".
- "auto-fix" being correct for a code *bug* is a claim you can't defend. Split it or escalate bugs.
- With no evidence, the engine still names a cause (it picked "flaky" for a 4-way tie). Add an
  "unknown / not reliable" output.
- The `log_coverage` evidence has equal numbers for every cause, so it does nothing. Remove it from the maths.
- Your disclosure says humans set every weight, but the weights were AI-drafted. Fix that wording. It
  is an integrity issue.
- Fill in the per-member AI rows and get supervisor sign-off on the method change.
- The CI owner has no commits on `main`. Make sure he can explain and own the CI modules in the viva.
- Hide the scripted "Proposal PoC" tab during the final demo.
- Stop writing more process docs. Spend the time on real CI cases, a rerun of QA, and the report.
