# TriageCore architecture and direction audit (FYP-1)

Auditor stance: senior architect / strict FYP examiner. Read-only audit of `main` at `e2fd8ac`
(2026-10-25). Nothing in the repo was changed except this file.

---

## 0. Executive verdict

**The core architecture is sound and above the usual FYP standard.** The engine is a small, pure,
well-tested module (`src/core/`, ~700 LOC). Diagnosis and decision are kept apart in code. The weights
loader is strict, and the LLM is properly limited to proposing. You do **not** need to change the
overall architecture. What needs work is the *evidence that the architecture works* and the *CI half of
the story*.

**Three biggest risks:**
1. **The CI agent, which the shared-engine claim depends on, is at 0%.** All 11 C-lane tasks are open.
   No commit on `main` is authored by the CI owner (authors: AbdulMohaimin4, Taimoor, Taimoor Ahmad).
   `TODO.md` §9 mentions an unexplained "solo ownership change". The current CI design also has a
   **label-leakage flaw** (`flaky` label = "passed on rerun", and `rerun_history` is evidence).
2. **The QA evaluation is circular and the baseline is a strawman.** The weights (`09c6808`) and the
   scenarios plus labels (`6405bf8`) were committed 44 seconds apart by the same author. The only step
   where TriageCore beats `penalty_rule` (12/12 vs 11/12) is `lab_slow_render`, and `penalty_rule`
   *cannot* output `flag` by construction. On this suite the result does not separate the Bayes
   engine from a hand rule.
3. **One of the four "caught" regressions is caught by luck of the loss table, not by the diagnosis.**
   For `lab_silent_noop` the engine believes P(stale_selector) = 0.79, so its diagnosis is wrong. It
   escalates only because 0.79 < 0.83. Six single-likelihood ±50% perturbations flip it to `heal`
   (measured), and so would lowering one cost from 5 to 4 (computed). The cause is exactly the
   independence assumption ADR 004 flags as a risk.

**FYP-1 readiness:** QA half: ready to demo, report needs honest reframing. CI half: not ready, and
at risk of not being ready. Process/docs: over-built relative to code (≈19.5k words of planning docs
vs 1,658 lines of `src/` Python). Overall: **pass-capable, not yet defensible at a high grade.** The
MUST list below is about 6–9 person-days of focused work plus the CI decision.

---

## 1. Recommendations (ranked)

### MUST-CHANGE before FYP-1 submission

| # | Change | Rationale and evidence | Effort |
|---|---|---|---|
| M1 | **Resolve CI ownership and cut CI to a minimum viable slice now.** Confirm whether Shazil is active. If yes, he must start C2/C4/C1 this week. If not, record it in `docs/log/changes.md`, tell the supervisor, and shrink CI to: C2, C1, C4, C7, a smaller corpus C3 (~20 cases), C8, C9, C10 (offline). Move **C5 (webhook) and C11 (CI screen) to FYP-2**. | Handbook: FYP-1 Final expects ~45% of committed scope and "each member can explain their owned module" (`reference/fyp-rules/BS-FYP-Handbook-2026.md` ~L838–841). Individual grading applies when performance differs (L170). Evidence: `TODO.md` §5–6 all `[ ]`. `src/ci/__init__.py` is empty (3 lines). `git log` shows no Shazil-authored commit on `main`. `TODO.md` §9 line 1 says "solo ownership change", but `docs/brief.md` L61–63 still lists three owners. | Decision: 1 day. Slice: 8–12 person-days. |
| M2 | **Fix the CI label leakage in C1 before anyone approves the contract.** Under ADR 006 the `flaky` label is defined as "same commit failed then passed on rerun". C1's draft makes `rerun_history = passed_on_rerun` an evidence group, and `rerun` is the action. The evaluation would then score the engine on a feature that *is* the label, and "recommend rerun" after it already passed on rerun is not a decision. Choose one: (a) evidence = **pre-rerun facts only** (log facts, commit/dependency facts, this test's history on *other* commits), with the label from the rerun outcome; or (b) keep rerun history as evidence and drop `rerun` as the decision target for those cases. | `docs/adr/006-ci-scope-and-rerun.md` L27–30 (label rules). `docs/tasks/c1.md` L12 (`rerun_history` group). `docs/tasks/c8.md` step 4 ("`passed_on_rerun` … leads to `rerun`"). | 0.5 day of design, inside C1 |
| M3 | **Make the QA evaluation non-circular and the baselines fair.** (a) Do B2 (Wilson CIs), Q4 (`simple_rule`) and an `always_escalate` baseline. (b) Add **total cost under the loss table** as a metric, so "escalate everything" and "heal everything" are both penalised. (c) Re-run `penalty_rule` with a `flag` branch, or say explicitly that it can't flag. (d) **Freeze the weights (tag or hash), then write new cases with labels by someone other than the weight author**, before running. B1 does this; start it now. (e) In the report, call the 12 steps a *development/sanity suite*, not an evaluation. | Weights `09c6808` 2026-10-12 21:03:42, scenarios `6405bf8` 21:04:26, same author. `src/eval/evaluate.py` L42–52: `penalty_rule` returns only `heal`/`escalate`. Measured: the only differing row is `lab_slow_render` (penalty `heal`, truth `flag`). `docs/plan.md` §9 already admits 0/4 bounds the masked rate only below ~53%. | B2 0.5d · Q4 0.5d · always-escalate + cost metric 0.5d · B1 3–5d |
| M4 | **Address the `silent_noop` fragility as a modelling decision, not a weight tweak.** Under the real weights, "click succeeded, no error, no console noise, but expected result never appeared" gives P(stale) = 0.793. Three correlated "nothing went wrong" groups (`runtime_failure=0`, `console_noise=absent`, `action_outcome=succeeded`) multiply against the one decisive group (`state_progression=not_reached`). That is the double counting the grouping was meant to prevent, in the "healthy" direction. Options for the team (all human decisions): (a) **a hard precondition: `heal` is blocked when `expected_state_reached is False`**. This fits the existing "hard safety preconditions" contribution and `QAAdapter.blocked_actions`. (b) Merge `runtime_failure`, `console_noise` and `action_outcome` into one joint "symptom" group. (c) Keep the model and report the margin openly. Whatever you pick, report `cause_accuracy` (11/12; this is the miss). | `make sensitivity` output (§4): all 6 flips are `silent_noop/low escalate -> heal`. `results/qa_eval_latest.json` row `lab_silent_noop`: `triagecore_cause=stale_selector, p_stale=0.7932`. Computed: escalate EL 0.816 vs heal EL 0.988 at C_mask=5; at C_mask=4 heal EL = 0.805 < 0.816, so it would heal (a masked regression). `src/core/evidence.py` L1–13 claims correlated signals are counted once. | (a) 0.5 day code + tests, plus a human decision · (b) 1–2 days plus new human weights |
| M5 | **Fix the misleading break-even line in every reasoning trace.** For clean evidence on a high-risk step the trace says "heal needs P>=0.99", shows P(stale) = 0.979, and then decides `heal` (measured). The two-outcome τ is only exact when the wrong cause is the costliest one, and with three causes it is not. An examiner reading one trace will see an apparent contradiction. Show the actual expected-loss comparison (already present), or express the break-even on P(likely_regression). Correct `engine_io.md` too. | `src/core/weights.py` L267–291 (`implied_threshold`, "two-outcome view"). `src/core/engine.py` L139–146 prints it as "Break-even". `docs/contracts/engine_io.md` L44–47. Measured trace for `clean_heal/high`: `expected loss: heal 0.33, flag 1.26, escalate 1.00. Break-even: heal needs P>=0.99 … Decision: heal.` | 0.5 day |
| M6 | **Get the scripted CI route off the real `/api/ci/*` namespace.** `POST /api/ci/triage` returns invented reasoning such as "Confidence exceeds threshold (92% >= 85%) … safe for autonomous pipeline rerun". It is mounted in the production app at the exact prefix where the real CI routes will go (C10, FR-A1). Move legacy routes under `/api/legacy/...` or mount them only behind an env flag. The legacy `ScenarioResponse.classification` also allows the action-like values `SAFE_HEAL` / `MASKED_REGRESSION_ESCALATED` (rule 2), which is fine only while it is clearly quarantined. | `src/api/app.py` L9, L32. `archive/poc/legacy_routes.py` L84–137 (hardcoded 92/96/15), L45. `docs/spec.md` FR-A1 (`/api/ci/*`). | 0.5 day |
| M7 | **Make the contract model match ADR 004 and make `make lint` green.** `ConfidenceEngineOutput.recommended_action` is described as "derived from comparing the confidence score to the threshold", which is exactly what ADR 004 replaced. This is the first file a panel opens. `make lint` exits 2 (5 findings, all in `models.py`). Repo CI lints only changed files, so this never shows red. Also add `rerun` (C2). | `src/core/models.py` L14. `docs/contracts/engine_io.md` L41–43. `.github/workflows/ci.yml` "Lint changed Python files". §4 lint output. | 15–30 min |
| M8 | **Members must own the AI-drafted design docs and be able to defend the maths.** `spec.md` and `plan.md` say "AI-written 2026-10-25, to be reviewed". `disclosure.md` §2 is unfilled. The hand calculation in `test_posterior_matches_hand_calculation` is not yet checked by a human (`docs/tasks.md` M1). Elicitation was AI-framed ("the AI … offered 3–4 framed options"). Disclose that framing as an anchoring risk. | `docs/spec.md` L3, `docs/plan.md` L3, `docs/disclosure.md` L36–41, `docs/contracts/weights_elicitation.md` L5. Handbook ~L840. | 1–2 days across the team |

### SHOULD-CHANGE

| # | Change | Rationale and evidence | Effort |
|---|---|---|---|
| S1 | **Extend sensitivity analysis** to priors, loss values and `unknown_pattern_floor`. Run it on the *actual* evidence vectors from the scenario run (not only the 12 synthetic `reference_cases`), and report each case's **margin to flip**. | `src/core/sensitivity.py` L25–46 perturbs likelihoods only. L64–86 uses hand-built cases. M4 shows a cost perturbation flips a regression to `heal`, which the current tool cannot reveal. | 1 day |
| S2 | **Be precise about `confidence_score`.** It is an uncalibrated naive-Bayes posterior, and when the decision is `escalate` it reports the P of a *hypothetical* action. So a real bug shows "confidence 79" (silent_noop) and a crash shows "confidence 25". Rename it in the UI/report ("P(heal would be correct)"), always show the posterior, and state "not calibrated; FYP-2 M7". | `src/core/decision.py` L46–55. `docs/contracts/engine_io.md` L33. ADR 004 L60 already predicts overconfidence. | 0.5 day |
| S3 | **Do not output a diagnosis when there is no basis for one.** With no evidence the engine returns `classification=stale_selector` (the prior's argmax) with confidence 0 (measured). With "unrecognised pattern" it still returns the nearest label, although `weights.yaml` L83 says it should not "force the nearest label". Add `unknown` (contract change) or a `diagnosis_reliable: false` flag. | `src/core/engine.py` L93–104. Measured: `no-evidence: stale_selector 0 escalate`. | 0.5 day + team decision |
| S4 | **Separate "LLM picked the wrong element" from "app regression".** The hypothesis space has no relocation-error cause, so a wrong relocation that fails the expected state is *diagnosed* as `likely_regression`. The action is safe but the diagnosis is false. In evaluation, add a per-step `correct_target` to the scenario truth, check the clicked element, and report **wrong-element heals** as their own metric. `lab_ambiguous` relies on a product-specific marker to catch this, and that should be stated, not implicit. | `src/core/weights.yaml` L19 hypotheses. `tests/dummy/scenario_lab.html` L40–41. `results/…` row `lab_ambiguous` proposed `#button-slot > button.btn.add-btn` → heal, scored acceptable without checking the target. | 1 day |
| S5 | **Fix the risk-tier semantics.** The collector *clicks first, then decides* (`runner.py` step 4). So "high = irreversible step, e.g. payment" is wrong as written: the side effect already happened in the test environment. The tier really encodes *the business cost of masking a bug in this step*. Say that in `raw_signals.md`, the ADR and (human) `weights.yaml` comments. For CI, decide what `risk_tier` even means (e.g. default branch vs PR); the engine requires it. | `src/browser/runner.py` L156–175. `docs/contracts/raw_signals.md` L58. `src/core/weights.yaml` L98. `src/core/engine.py` L87–89 (required). | 0.5 day |
| S6 | **Do A4 early, and score error steps separately.** Current crash paths: `page.inner_html(container_selector)` on a missing container (Playwright default 30 s timeout, then an exception), non-`URLError` network errors in `GroqRelocator` (e.g. `ConnectionResetError`), and a `ValueError` from the adapter on malformed signals, which becomes a 500. A4 step 2 then sets *every* baseline to `escalate` on error steps. Report errors as a separate count, or they flatter all policies equally. | `src/browser/runner.py` L144. `src/browser/relocator.py` L84. `src/core/evidence.py` L39–48. `docs/tasks/a4.md` step 2. | 0.5–1 day (A4) |
| S7 | **Make results reproducible and protect cited numbers.** The README cites the 2026-10-20 run, but `results/qa_eval_latest.json` is overwritten by any `POST /api/qa/evaluate` (unauthenticated). Only "latest" is tracked. The report JSON has no git SHA, weights hash, model id or timing config. Add these fields and keep cited runs under `results/frozen/<date>_<sha>.json`. | `src/eval/evaluate.py` L111–124. `.gitignore` L30–31. `src/api/qa_routes.py` L117–121. | 0.5 day |
| S8 | **Rethink CI cost semantics before C9/C10.** C10 counts "bug + `rerun`" as *masked*, but a rerun of a real bug fails again and costs runner minutes; it hides nothing. In CI the expensive error is a wrong `auto-fix`. "Masked regression" is a QA-shaped metric; define the CI equivalents (wrong auto-fix, wasted reruns, needless escalations) and total cost. Also, `auto-fix` produces no artefact in FYP-1, so evaluate it as "would propose a fix PR". | `docs/tasks/c10.md` step 2. `docs/brief.md` glossary. | 0.5 day of design |
| S9 | **Run a cheap ablation in FYP-1, not only in FYP-2.** Engine minus risk tiers, minus hard blocks, minus missing-evidence handling, on the same evidence. It costs little (policies are pure functions over saved `raw_signals`) and is the most direct defence of "this is not just a rule". | `docs/fyp2.md` M7 lists it. `src/eval/evaluate.py` structure supports it. | 1 day |
| S10 | **Move `FixedRelocator` into `tests/`.** It is a test stand-in living in the production module. Rule 7 is respected today, but its location invites misuse. | `src/browser/relocator.py` L95–106. | 15 min |
| S11 | **Freeze the process machinery** (see Q10). Stop adding task files, lanes and routines, and put the hours into M1–M4 and the report. | Q10 | saves days |

### NICE-TO-HAVE / defer to FYP-2

- **C5 webhook endpoint and C11 CI screen**: FYP-2 (see M1). The webhook is infrastructure with little CCP value. ADR 006 itself argues that.
- **D1 VM deployment**: keep only a Dockerfile plus a one-command run for FYP-1 ("buildable without the original developer"). The public VM can wait for FYP-2 M6.
- **S1 SQLite store**: fine but small. An append-only JSONL decision log would meet FR-E10 for FYP-1 at a fraction of the cost. Keep SQLite only if C5 stays in scope.
- **Q3 `llm_judge` baseline**: valuable (it answers "why not just ask the LLM?"), but do it after Q4/B2/B1.
- Calibration from counts, reliability plots and conformal risk control: already in `docs/fyp2.md` M7. Correctly deferred.
- A deterministic locator ladder or a Healenium-style relocator behind `Relocator`: FYP-2. It would also make evaluation reproducible without Groq.

---

## 2. Findings per question

### Q1. Shared engine abstraction: **OK (with QA-shaped seams: CONCERN)**

**Genuine strengths (verified):**
- Domain logic is isolated behind `EvidenceAdapter`: `group_states`, `blocked_actions` and `group_states_spec` (`src/core/evidence.py` L28–33).
- The model (`EvidenceModel`) and policy (`DecisionPolicy`) are protocols (`evidence.py` L147–148, `decision.py` L29–30).
- Causes, groups, actions and losses are all data in `weights.yaml`, per domain (`weights.py` L44–57).
- The engine checks adapter groups against the YAML at start-up (`engine.py` L58–71).
- `test_shared_engine_handles_four_cause_ci_domain` runs a 4-cause domain through the same code (`tests/test_engine.py` L84–101).

This is a real abstraction, not a forced one.

**Seams that will bite CI (verified in code):**
- `source: Literal["qa","ci"]` and the loader's hardcoded `for name in ("qa","ci")` (`models.py` L7, `weights.py` L248). Fine for two domains, but it is not "pluggable".
- One shared `classification` / `recommended_action` enum union across domains (`models.py` L11, L14). There is no per-domain output typing, so a QA output could legally carry `dependency`. This is mitigated by validating hypotheses against the enum (`weights.py` L161–163).
- `risk_tier` is mandatory for every domain (`engine.py` L81–84), but CI has no defined tier (S5).
- `blocked_actions(raw_signals)` gets only `raw_signals`. The C1 draft puts `ambiguous_commit` / `attributed_commit` in **context**, so `CIAdapter.blocked_actions` cannot see them without a signature change or duplicating them into `raw_signals`. `docs/tasks/c1.md` L13–14 vs `evidence.py` L33. **This is a concrete design mismatch to resolve in C1/C8.**
- The single-shot decision does not model **sequential evidence** (rerun is both an action and an evidence source), which causes M2.
- `DirectStateAdapter` is the current default for `ci` (`engine.py` L55). Acceptable as a placeholder.

**Contract vs code:** `engine_io.md` matches the code except for M5 (threshold claim), M7 (model docstring) and `rerun` (known gap, C2).

### Q2. Method rigour: **CONCERN**

**Verified correct:**
- Log-prior plus summed log-likelihoods, log-sum-exp normalisation (`evidence.py` L163–188).
- Missing groups are marginalised (skipped) (L171–174).
- Expected loss is Σ loss·P, with argmin and ties to `escalate` (`decision.py` L39–44).
- Chow-style reject option. Risk-tiered loss tables.
- Cromwell's rule enforced (no 0/1) (`weights.py` L100–116). Rows must sum to 1.
- The hand calculation test is right: I checked 0.6·0.02·0.1 = 0.0012, 0.3·0.5·0.8 = 0.12, 0.1·0.05·0.5 = 0.0025.

This *is* naive Bayes plus Bayes-decision theory, implemented correctly. It is not a heuristic in disguise.

**What makes it "semi-naive":** only the pooling of `uncaught_page_errors`, `error_state_shown` and `failed_requests` into a count-valued `runtime_failure` group (`evidence.py` L69–75). That fits the Kononenko-style "joined attributes" meaning of semi-naive Bayes, but it is one joined group. **The remaining five groups are still naive**, and M4 shows the assumption fails on exactly the case that matters (silent bugs). An examiner will push here. Name the join explicitly as the semi-naive step, cite the source, and show (or fix) the silent-noop failure.

**Defensibility of hand-elicited weights:**
- Positive: a written sheet with one line of reason per value (`weights_elicitation.md`) and a sensitivity tool.
- Weak: one elicitor, AI-framed options (anchoring), no literature anchors for any number (e.g. the 0.70/0.15/0.15 priors are asserted, not sourced), and weights authored alongside the test cases (M3).
- Sensitivity covers likelihoods only (S1).
- No calibration (deferred, honestly, to FYP-2).

**Would an examiner call it "a weighted heuristic dressed up as Bayes"?** Not about the maths. But **on this evaluation they could fairly say the Bayes machinery is not shown to add value over a rule** (M3, S9). That is the attack to prepare for.

**`confidence_score`:** an uncalibrated posterior with known naive-Bayes overconfidence. When the engine escalates it is a counterfactual, which confuses readers (S2). Clean heals reach 98 on only five binary observations, which is typical NB overconfidence.

**Unknown-pattern floor:** "fit" is the geometric-mean per-group likelihood of the best cause (`evidence.py` L182). It is reasonable, but at 0.10 it almost never fires on 2–3-state groups. I saw no scenario where it triggered. It is effectively untested on real evidence (only `test_unrecognised_pattern_escalates`, with an artificial floor of 0.95).

### Q3. Invariant enforcement: **OK for the engine, CONCERN for pipelines**

| Invariant | Code | Test | Verdict |
|---|---|---|---|
| I1 classification is diagnosis only | `engine.py` L99–104; `weights.py` L161–163 (hypotheses ⊂ classification enum), L179–183 (actions ⊂ action enum, escalate not listable) | `test_classification_is_never_an_action` | OK. The enum sets are disjoint, so it is structurally guaranteed. |
| I2 missing/invalid weights raise | `weights.py` L227–264 | `test_missing_weights_file_raises`, `test_incomplete_weights_raise` (7 cases), `test_weights_must_match_adapter_groups` | OK. Minor: `unknown_pattern_floor` falls back to `0.0` in the dataclass when invalid (L223), but a problem is recorded first, so it still raises. |
| I3 heal needs exactly one element | `QAAdapter.blocked_actions` (`evidence.py` L94–110); collector clicks only when `match_count == 1` (`runner.py` L150–151) | `test_unusable_relocation_blocks_heal`, `test_ambiguous_selector_is_not_clicked` | OK for QA. `auto-fix` precondition: not built (C8). |
| I4 missing evidence ignored | `SemiNaiveBayes` | `test_missing_group_leaves_posterior_unchanged` | OK |
| I5 correlated signals once | one group only | `test_correlated_signals_counted_once` | Partial; see M4 |
| I6 LLM untrusted | `runner.py` L117–122 (`_count` handles invalid selectors) | `test_invalid_selector_counts_as_no_match` | OK |
| I7 every failure path escalates | engine: no evidence or unknown pattern blocks all autonomous actions (`engine.py` L88–97). Pipeline: **not enforced**; any unexpected exception aborts the scenario (A4) | `test_no_evidence_escalates`, `test_relocation_failure_is_recorded` | **CONCERN** (S6). The API returns 500 rather than escalate. |
| I8 nothing auto-applied | nothing writes files today | — | OK (vacuously; Q1 adds the patch) |
| I9 webhook signature | not built | — | n/a (C5) |
| I10 stand-ins not default | `run_scenarios` defaults to `GroqRelocator` (`qa_pipeline.py` L160) | review | OK; S10 |
| FR-E7 trace contents | `build_trace` | **no test asserts it** (`spec.md` FR-E7 says so) | CONCERN, trivial to add |

### Q4. LLM boundary: **OK**

- The LLM output is reduced to one backticked string (`relocator.py` L55–59, last match). It is counted in the DOM (`runner.py` L117–122), and only an exact single match is clicked.
- The proposed selector lands in `context.proposed_selector`, which is **not weighted** and not in the trace (`engine.py` builds the trace from states only).
- Retries and timeouts are bounded (`relocator.py` L67–92). A missing key leads to `RelocationError`, then `match_count=0`, then heal blocked.

**Residual influence:** the LLM chooses *which element is clicked*, so it indirectly shapes the post-click evidence. A wrong but plausible element that also satisfies a generic expected-state marker would be healed. This is controlled only by the quality of `expected_state_selector` (D4, author-supplied) (S4).

**Prompt injection:** page HTML is pasted raw into the prompt (`relocator.py` L45–52). The impact is bounded to "wrong selector", which is then verified. Acceptable, and correctly listed as R6.

**CI side:** the schema validation for log facts is only specified (FR-C3, C6). Not built.

### Q5. Evaluation design: **SERIOUS for a research claim, acceptable as a sanity check**

**Verified facts:**
- 12 triaged steps across 10 scenarios, on 2 team-built pages: `shopflow_app.html` and `scenario_lab.html` with 9 `?case=` variants.
- 4 regressions, 7 stale (2 of them accept `heal|escalate`), 1 flaky.
- Labels in `tests/scenarios/qa_scenarios.yaml`, by the same author as the weights, 44 s apart.
- One Groq run (2026-10-20). TriageCore 12/12, penalty_rule 11/12, blind_heal 7/12. Masked: 0/4, 0/4, 4/4. `cause_accuracy` 11/12.

**Problems:**
1. **Construct validity.** Each lab case was built to trigger one evidence group, so it tests the adapter's wiring rather than the method's generalisation.
2. **Circularity** (M3).
3. **Strawman baseline.** `penalty_rule` cannot flag. `simple_rule` and `llm_judge` are not built, and `always_escalate` is not planned at all.
4. **No total-cost metric.** `needless_escalations` is counted, but the loss-weighted total the engine actually optimises is never reported for any policy.
5. **No CIs** (B2 open).
6. **Lenient labels.** `acceptable: [heal, escalate]` on 2 of 12 steps means a policy can't be wrong there.
7. **Reproducibility.** Groq at temperature 0 is not guaranteed deterministic. Only one run was done, with no variance across runs, and the metadata is missing (S7).
8. **Unscored dimensions.** Heal correctness (right element) is not scored (S4). Timing NFRs are not measured (Q2 open), and per-step durations of 5.8–7.3 s (from results) are close to the 10 s budget.

**For FYP-1** this is acceptable *if reported as preliminary*. The README and EvaluationScreen already say "small sample, preliminary"; good. The FYP-2 plan (held-out split, ≥59 regressions) is the right plan. B1 (real-app cases with labels written before runs) is the single most valuable evaluation task in FYP-1, and it is scheduled last in its lane.

### Q6. Scope and schedule realism: **SERIOUS (CI)**

- Done: section 1 (cleanup, 5 tasks).
- Open: 20 coded tasks plus section 9 human work.
- The QA lane (A4, Q1, Q2, Q3, Q4, B2, B1) is about 5–8 person-days and realistic.
- The CI lane is 11 tasks from zero. Three need human decisions (C1, C3 labelling of 30–40 real runs, C9 weights), and the owner has no visible activity.
- The corpus alone (find 30–40 real failed runs with rerun history and commit lists, verify each label) is several days of human work.

**Cut or defer:** C5, C11, D1-on-a-VM, S1-as-SQLite (see NICE). Shrink C3 to ~20 cases with ≥4 per cause, and state per-cause counts honestly. If CI slips entirely, the fallback claim is "engine shown to generalise on a synthetic 4-cause domain plus a small real corpus". Write that down *now* as the contingency in `docs/log/changes.md`, with supervisor sign-off.

### Q7. Doc/code drift: **CONCERN (many small items)**

1. `src/core/models.py` L14: "derived from comparing the confidence score to the threshold" vs ADR 004 and `engine_io.md` L41–43 (replaced by minimum expected loss).
2. `engine_io.md` L44–47 and every trace: τ "high 0.99" presented as the heal rule, but the engine heals at P = 0.979 (M5).
3. `weights.yaml` L83: "escalates … instead of forcing the nearest label". Code still emits the nearest label as `classification` (`engine.py` L99) (S3).
4. `evidence.py` L1–13 and ADR 004: "signals that share a cause count once". True only inside `runtime_failure` (M4).
5. `qa_pipeline.py` L9–10: "The LangGraph state machine of Milestone 3 will wrap the same two calls". ADR 005 dropped LangGraph.
6. `engine.py` L14–15: "Persistence (src/db/store.py)". ADR 004 L68 says Postgres; ADR 005 and plan say SQLite. The ADR 004 text is stale.
7. `docs/plan.md` §2: `api/ app.py [planned]`, but `app.py` exists (A1 done). `spec.md` FR-A1 and FR-U4 are still "Todo" although A1, A2 and A3 are `[x]` in `TODO.md`.
8. `docs/tasks.md` M1 says "28 engine tests"; correct (measured 28). `README` says `make test` takes ~2 min; correct (106 s).
9. `docs/brief.md` lists 3 owners, while `TODO.md` §9 mentions a solo-ownership change that is not recorded in `docs/log/changes.md`.
10. `raw_signals.md` L41: `step_id` type `int`, but the code uses string ids (`qa_scenarios.yaml`, e.g. `add_to_cart`).
11. `raw_signals.md` "Resolved questions" #3 says the observation window is "still open" (the PoC used 500 ms). The code fixes 1500 + 400 ms (`runner.py` L54–55).
12. `engine_io.md`: `risk_tier` is `low | medium | high`, but the CI synthetic fixture uses `default`. Harmless, but the contract should say tiers are per domain.
13. `docs/changes.md` row 7 references `docs/roadmap.md`, which no longer exists (row 12 folded it). Fine as history; just noting it.

### Q8. Academic integrity / demo risk: **CONCERN (route placement), otherwise OK**

- Labelling is good. The legacy UI shows "Proposal-stage demo. Numbers on these screens are scripted, not measured." (`frontend/src/legacy/LegacyPoc.jsx` L132). The README and AGENTS mark it clearly, and `docs/tasks.md` notes the POC's hardcoded 96/94/15.
- **Risk:** `POST /api/ci/triage` is live in the real app under the real CI prefix and returns polished, invented reasoning plus a fake draft PR (`archive/poc/legacy_routes.py` L84–137). Until real CI exists, this is the *only* CI that works in the product. A teammate under deadline pressure could demo it as real. Fix with M6. Also never show the "Proposal PoC" tab in the FYP-1 Final demo unless asked.
- Scripted numbers also sit in `frontend/src/legacy/PipelineSimulator.jsx` (L227–333) and `LegacyPoc.jsx` (L23–72); they are isolated under `legacy/`.
- **AI disclosure:**
  - The structure is good: tool table, levels, a human-owned decision list, the per-change log `docs/log/ai-usage-log.md` (70 lines), and the change log with an approval column.
  - Gaps: §2 per-member rows are not filled. Most "Supervisor approval" cells say "Not recorded" or "To record", including the method change (row 2, which was "AI-proposed") and the CI scope cut (row 8). **Get those approvals recorded before FYP-1 Final.** An unapproved scope cut is an integrity issue under FAST Guide §5.3.
  - The spec and plan are AI-written; disclose this and rewrite them (M8).

### Q9. Engineering quality: **OK, with security gaps tracked**

**Strengths:**
- Clean module boundaries. `core` imports only `core` and pydantic/yaml (verified via imports). `browser` doesn't import `core`.
- Frozen dataclasses, type hints, protocols.
- Strict input validation in the adapter.
- Tests: 28 engine + 12 collector + 4 end-to-end = 44, all passing (measured, 106 s). Repo CI runs them on PRs.

**Weaknesses:**
- `make lint` fails (M7).
- No test asserts trace content (FR-E7).
- No API tests for `qa_routes` (only manual).
- `get_engine()` caches an error forever (`qa_routes.py` L35–40), so a fixed `weights.yaml` needs a server restart. That is fine, but undocumented.
- The pipeline has no fail-safe (S6).

**Security (verified):**
- `POST /api/qa/run` and `/api/qa/evaluate` are unauthenticated. They launch Chromium, spend Groq credits and overwrite cited results. `headless` is client-controlled (`qa_routes.py` L103–121).
- Mitigation today: `uvicorn` binds to 127.0.0.1 by default (`Makefile` `api` target sets no `--host`). FR-A3 (token) is planned in D1. **Do not deploy D1 without FR-A3.**
- CORS `allow_credentials=True` with an explicit localhost origin list (`app.py` L15–27) is OK.
- Secrets: `.env` is git-ignored (`.gitignore` L15–18). The API key is sent only in the `Authorization` header and is not logged. I did not open `.env`.
- Webhook signature: not implemented yet (C5).

### Q10. Process overhead: **CONCERN**

- Measured: ≈19,477 words across `docs/*.md`, `docs/tasks/*.md`, `docs/contracts/*.md`, `docs/adr/*.md`, `AGENTS.md` and `TODO.md`, vs **1,658 lines of `src/` Python**.
- There are 26 task files, lanes, branches per section, a mandatory session routine, an end-of-session report format and an AI-usage-log line per task.
- For three students this is heavier than a typical professional team uses. The last ~15 commits are mostly docs and process (`git log` heads: "docs: …", "refactor … (A2)", "docs(todo) …").
- Some of it pays off. The ADRs, contracts and change log are exactly what the handbook rewards. The task files are worth it as agent prompts.
- But the planning layer now drifts from the code (Q7), and it consumed the week the CI lane needed.

Recommendation: **freeze it.** Keep AGENTS.md, TODO.md, ADRs, contracts and the logs. Stop writing new task files until FYP-2. Merge `progress.md` into `TODO.md` notes. Spend the time on M1–M4 and the report.

### Q11. Novelty / contribution framing: **CONCERN (fixable by reframing)**

- **What is defensible:** a *decision layer* that sits **after** any locator-healing step and decides, from **post-action behavioural evidence** and **asymmetric, risk-tiered costs**, whether a heal may be accepted or must go to a human, with hard preconditions and an exact trace.
- **How existing tools differ:** Healenium computes a tree/LCS similarity between the stored last-good element path and the current DOM, and generates scored replacement locators ([Healenium docs](https://www.healenium.io/docs/how_healenium_works); [overview](https://medium.com/geekculture/healenium-self-healing-library-for-selenium-test-automation-26c2358629c5)). Its score measures *how similar the new element is*, not *whether the app still works*. Commercial smart locators (Testim, mabl, etc.) are, to my general knowledge (not verified in this audit), multi-attribute element fingerprints with the same blind spot. So the "masked regression" gap is real, and the post-click evidence plus reject option is a legitimate angle.
- **What is weak:**
  1. The brief's contribution list is long: "evidence grouping, cost-aware decision with a reject option, risk tiers, hard safety preconditions, the post-action evidence collector, the shared taxonomy, and an evaluation against baselines" (`docs/brief.md` L27–29). The proposal adds "commit-level root-cause tracing" (`docs/proposal.md` L37). That reads as a feature list, not one claim.
  2. Each component is textbook: naive Bayes, Bayes risk, Chow's reject option. The novelty is the *application and the safety framing*, which is fine for an FYP, but only if the evaluation shows it beats simple alternatives (M3, S9).
  3. The "shared engine" claim is currently unproven on real CI data.

- **Suggested one-sentence contribution:** *"A relocator-agnostic, cost-sensitive accept/escalate gate for self-healing tests, using post-action evidence, shown to cut masked regressions vs blind and rule-based healing at a stated escalation cost, and reused unchanged for CI failure triage."*
- **Experiments that make it defensible:**
  - TriageCore vs `blind_heal`, `simple_rule`, `always_escalate` and `llm_judge`, on cases not authored alongside the weights.
  - An ablation (S9).
  - If time allows, the same gate in front of a second relocator (e.g. a deterministic ladder), to prove "relocator-agnostic".

---

## 3. Command outputs (actual, run 2026-10-25)

`make test-engine`
```
.venv/bin/python -m pytest -q tests/test_engine.py
............................                                             [100%]
28 passed in 1.69s
exit=0
```

`make test`
```
.venv/bin/python -m pytest -q
............................................                             [100%]
44 passed in 106.39s (0:01:46)
exit=0
```

`make lint`: **fails**
```
.venv/bin/python -m ruff check src tests
I001 [*] Import block is un-sorted or un-formatted  --> src/core/models.py:1:1
UP035 `typing.Dict` is deprecated, use `dict` instead  --> src/core/models.py:2:1
F401 [*] `typing.Optional` imported but unused  --> src/core/models.py:2:40
UP006 [*] Use `dict` instead of `Dict` for type annotation  --> src/core/models.py:7:18
UP006 [*] Use `dict` instead of `Dict` for type annotation  --> src/core/models.py:8:14
Found 5 errors.
[*] 4 fixable with `--fix`.
make: *** [Makefile:24: lint] Error 1
exit=2
```

`make weights`
```
OK: /home/user/Desktop/TriageCore/src/core/weights.yaml
  qa: causes=['stale_selector', 'likely_regression', 'flaky'] groups=['runtime_failure', 'state_progression', 'console_noise', 'action_outcome', 'timing'] tiers=['low', 'medium', 'high']
  ci: disabled
exit=0
```

`make sensitivity` (only prints; checked `src/core/sensitivity.py`, which writes no files)
```
clean_heal/low         -> heal      (stale_selector, confidence 98)
console_noise/low      -> heal      (stale_selector, confidence 95)
trap/low               -> escalate  (likely_regression, confidence 8)
silent_noop/low        -> escalate  (stale_selector, confidence 79)
tracking_404/low       -> heal      (stale_selector, confidence 95)
slow_render/low        -> flag      (flaky, confidence 89)
clean_heal/high        -> heal      (stale_selector, confidence 98)
console_noise/high     -> escalate  (stale_selector, confidence 95)
trap/high              -> escalate  (likely_regression, confidence 8)
silent_noop/high       -> escalate  (stale_selector, confidence 79)
tracking_404/high      -> escalate  (stale_selector, confidence 95)
slow_render/high       -> flag      (flaky, confidence 89)

6 decision flip(s) under +/-50% perturbation of single likelihoods:
  silent_noop/low        escalate -> heal   when qa.runtime_failure.likely_regression[0] x0.5
  silent_noop/low        escalate -> heal   when qa.state_progression.stale_selector[reached] x0.5
  silent_noop/low        escalate -> heal   when qa.state_progression.stale_selector[not_reached] x1.5
  silent_noop/low        escalate -> heal   when qa.console_noise.likely_regression[present] x1.5
  silent_noop/low        escalate -> heal   when qa.console_noise.likely_regression[absent] x0.5
  silent_noop/low        escalate -> heal   when qa.action_outcome.likely_regression[succeeded] x0.5
exit=0
```

Read-only engine probe with the real weights (inline Python, no files written):
```
clean_heal/high heal 98 {'heal': 0.334, 'flag': 1.259, 'escalate': 0.997}
   … Risk tier 'high', expected loss: heal 0.33, flag 1.26, escalate 1.00. Break-even: heal needs P>=0.99, flag needs P>=0.99. Decision: heal.
silent_noop/low escalate 79 {'heal': 0.988, 'flag': 1.711, 'escalate': 0.816}
   … Posterior: stale_selector 0.793, likely_regression 0.184, flaky 0.023 -> most probable cause: stale_selector. … Decision: escalate to a human.
no-evidence: stale_selector 0 escalate
```

Summary of `results/qa_eval_latest.json` (generated 2026-10-20T13:23:13, GroqRelocator):
```
blind_heal   acceptable 7/12  masked 4/4  needless 0
penalty_rule acceptable 11/12 masked 0/4  needless 0
triagecore   acceptable 12/12 masked 0/4  needless 0  cause_accuracy 0.917
only differing row triagecore vs penalty_rule: lab_slow_render (flag vs heal; truth flag)
cause miss: lab_silent_noop (truth likely_regression, diagnosed stale_selector, p_stale 0.7932)
per-step duration 3.0–7.3 s
```

Not run: `make eval` (needs a Groq key and writes `results/`, as instructed), `make verify` (frontend build not required for this audit).

---

## 4. Verified vs inferred

**Verified (read or ran):**
- Every file cited above.
- All command outputs in §3.
- Commit order and authorship of the weights and scenarios.
- Authors on `main` history.
- The 0.79 posterior and the break-even contradiction.
- The C_mask 5→4 flip, computed from the measured posterior (0.184·4 + 0.023·3 = 0.805 < 0.816).
- The legacy route mount.
- The `.gitignore` coverage of `.env` and `results/`.

**Inferred (not verified):**
- Whether Shazil is still on the team. The "solo ownership change" wording is ambiguous, and I only checked commit authorship, not branches on the remote or other forks.
- That the weight author saw the scenarios while choosing values. The 44 s gap strongly suggests joint development but doesn't prove it.
- Commercial-tool internals (Testim, mabl).
- Whether panel members would accept the 12-step suite as an "evaluation".
- Groq run-to-run variance (one run only).
- uvicorn's default bind to 127.0.0.1 is from the standard default, not tested here.
- I did not read `docs/proposal.md` beyond grepping claims, `reference/` beyond the handbook sections on FYP-1 Mid/Final, the frontend beyond the real/legacy split, or `tests/test_runner.py` beyond test names.
