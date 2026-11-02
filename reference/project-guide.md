# TriageCore: a plain-language project guide

This guide explains what the project is for, what a user gives it, what it returns, and how its decision engine works. It is written for a teammate who is new to the code and the project vocabulary. Status as of **2026-11-02, end of FYP-1**.

If you only have 20 minutes, read sections 1, 3, 6.3, 6.6 and 11.

---

## 1. The short version

When an automated test fails, TriageCore gathers clues about the failure, estimates what probably caused it, and recommends a next step. It recommends a safe recovery only when the clues are strong enough. When acting could hide a real bug, or the clues are weak, it escalates the case to a person.

The project has two uses, and both work today:

1. **QA:** investigate a failed browser test step (complete; tested on demo pages and a real open-source app).
2. **CI:** investigate a failed GitHub Actions job (works offline on saved logs; live GitHub use is FYP-2).

They use different evidence and different cause labels, but they share the same **ConfidenceEngine**. Being able to show that the same engine handles both domains is the main idea of the project.

## 2. What problem is it trying to solve?

Imagine a browser test clicks a button using the selector `#submit-order`, but the button's ID changed during a UI refactor. The test fails, even though the app may still work.

A basic self-healing tool might find a similar button, click it, and call the test fixed. But what if the click handler now has a real bug? The replacement click might hide a problem the test was supposed to catch.

The CI version of the same problem: a GitHub Actions job fails. Was it a flaky network blip (just rerun), a broken dependency update (fixable), a real code bug (a human must look), or the CI machine itself (infrastructure)? Rerunning everything hides real bugs. Escalating everything wastes engineers' time.

TriageCore answers two questions separately:

1. **What is the likely cause?** This is the `classification` (diagnosis).
2. **What should happen next?** This is the `recommended_action` (decision).

For example, the likely cause may be `likely_regression`, while the recommended action is `escalate`. **A cause is not an action**, and the code never mixes them.

The worst mistake in this project has a name: a **masked regression**. It means a real application bug that the system let pass without a person seeing it.

## 3. The whole system in one picture

```text
              QA side                                   CI side
   test step in qa_scenarios.yaml          saved GitHub Actions log + run + commits
                ↓                                          ↓
   Playwright runner gathers clues          log trimmed in the middle, secrets masked
   (Groq proposes ONE selector if broken)   Groq extracts facts, schema checks them
                ↓                                          ↓
           QAAdapter                     commit tracing (one commit, or ambiguous?)
                ↓                                          ↓
                └──────────►   ConfidenceEngine   ◄───────┘
                               (same code for both)
                     1. Bayes: probability of each cause
                     2. hard blocks remove unsafe actions
                     3. expected loss: pick the cheapest action
                                   ↓
        classification + diagnosis_reliable + recommended_action
                 + confidence_score + reasoning_trace
                                   ↓
              saved in SQLite · shown in the UI · scored by the evaluator
```

**The engine does not know whether it is looking at a browser test or a CI job.** Each side has an *adapter* that turns its raw clues into evidence states, and each side has its own block of numbers in `src/core/weights.yaml`. The engine runs the same steps on both.

> Honest caveat: there is currently one CI-specific line inside the engine (`src/core/engine.py`: "a bug diagnosis must escalate"). The 2026-11-02 audit recommends moving that rule into the CI cost table or the CI adapter, so that the engine is fully shared.

---

## 4. The QA agent

### 4.1 What the user gives it

The user supplies a browser test scenario. A scenario includes:

- a page to open;
- an action to take;
- the original selector used by the test;
- a way to check whether the expected result happened (the *expected-state marker*, written by the test author);
- the step's risk tier (`low`, `medium`, `high`);
- optionally, the part of the page to search for a replacement element.

Here, "test" means a step described in `tests/scenarios/qa_scenarios.yaml` and run by the project's Python Playwright runner. It is **not** an ordinary Playwright test file that TriageCore edits. TriageCore also does **not** start from a plain-English request and invent a whole test.

### 4.2 What is a selector, and what does "heal" change?

A **selector** is a string Playwright uses to find an element on a web page. For example, `#add-to-cart` means "find the element whose HTML `id` is `add-to-cart`". The `#` is the CSS symbol for an ID. If a developer changes that ID, the old selector no longer finds the button.

If the old selector fails, Playwright reads the current HTML inside the page area named in the scenario, or the whole page body if no area is named. TriageCore sends Groq three things:

- the old selector;
- the element's purpose;
- at most the **first 6,000 characters** of that HTML (`MAX_HTML_CHARS` in `src/browser/relocator.py`).

So **Groq only sees what is in its prompt**. If the target element is outside the chosen area, or after the first 6,000 characters, Groq may not see it. The 6,000 limit is an implementation choice; its reason is not recorded as a reviewed design decision.

Groq is asked for **one** replacement selector. The code retries if the network or API call fails, but it never asks for more guesses because a guess was wrong. Playwright then checks how many elements the proposed selector matches:

- **0 matches:** there is nothing to click, so `heal` is blocked.
- **More than 1 match:** the runner refuses to choose, so `heal` is blocked.
- **Exactly 1 match:** the runner clicks it and watches what happens.

**Exactly one match only proves there is one match. It does not prove it is the intended element.** A wrong button can be the only match for a weak selector. That is why the result after the click matters. If the expected result is not reached, `heal` is blocked as a hard rule (task X1), whatever the probabilities say.

`heal` means: **use the replacement selector for this run instead of the broken one.** It does not change the app, does not write to `qa_scenarios.yaml`, and does not edit any test file. A healed step shows a **suggested selector patch** (task Q1) for a person to review. Nothing is ever applied automatically.

### 4.3 What the runner does, step by step

1. Tries the original selector.
2. If it fails, waits briefly and retries it. The page may simply be slow.
3. If it still cannot find the element, asks the Groq relocator for one replacement selector.
4. Checks that the replacement matches exactly one element.
5. Clicks it and watches for clues: did the expected result appear? Was there a page error, an error banner, a failed request, or console noise?
6. Sends the evidence and the step's risk tier to the ConfidenceEngine.

If anything crashes while collecting evidence, the step escalates instead of crashing the run (task A4).

### 4.4 What the user gets back

A likely cause (`stale_selector`, `likely_regression` or `flaky`), an action, a reliability flag, a confidence score, and a reasoning trace. The action is one of:

- `heal`: use the relocated selector for this run, and show a suggested patch.
- `flag`: treat it as flaky and report it.
- `escalate`: stop and ask a human.

### 4.5 Safeguards that are still open

These are known gaps. Say them before an examiner does.

1. **No identity check before clicking.** We do not yet check the element's role and accessible name. Example: the target should be the "Add to Cart" button inside the keyboard's product card, not just any unique button.
2. **The risk tier does not stop the first click.** On a dangerous step (payment, delete), the runner still clicks the replacement to collect evidence *before* the engine decides. Real use would need a safe test environment, or a rule that stops before clicking on high-risk steps.

Neither of these is implemented. No single check proves correctness in every application. Each check only lowers the risk.

---

## 5. The CI agent

### 5.1 What "CI failure" means here

CI means **continuous integration**. When a developer pushes code or opens a pull request, GitHub Actions automatically runs checks such as tests, linting and builds. A failed check leaves a log that helps explain the cause.

Two things are easy to mix up:

- `.github/workflows/ci.yml` runs checks **on TriageCore itself** (lint, tests, frontend build on every PR).
- The **TriageCore CI agent** analyses failed GitHub Actions jobs from *other* projects.

### 5.2 What goes in, what comes out

**Input (FYP-1):** one failed job, given as a saved log plus details about the run and the recent commits (which files each commit changed). It is **offline**: we feed it saved cases, and it does not watch GitHub live.

**Pipeline** (`src/agents/ci_pipeline.py`):

1. **Trim the log in the middle** (`src/ci/truncate.py`). CI logs can be huge. We keep the start (about 30%: setup and versions) and the end (the rest: where the error usually is), up to about 16,000 tokens by default. The middle is cut, and the cut is recorded.
2. **Mask secrets**, so tokens or passwords in the log are never sent to Groq or shown in the UI.
3. **Extract facts with the LLM** (`src/ci/facts.py`). Groq must return JSON with exactly these fields:
   - `failure_kind`: one of `test_assertion`, `compile_or_syntax`, `import_or_missing_module`, `dependency_resolution`, `network_or_timeout`, `runner_or_resources`, `other`;
   - `failing_files`: up to 20 paths;
   - `error_excerpt`: up to 300 characters.

   A Pydantic schema checks this, and anything that does not fit is rejected. The LLM's free text never reaches the decision.
4. **Trace the failure to a commit** (`src/ci/tracing.py`). It compares failing files and dependency files (lockfiles, `requirements.txt`, `package.json` and similar) with the files each recent commit changed. One matching commit is the **attributed commit**. Two or more matches set `ambiguous_commit = true`. It never picks one silently.
5. **Send the evidence to the engine** through `CIAdapter` (`src/core/evidence.py`).

If anything throws an error, the result is `escalate`. If fact extraction fails, the case is marked as an extraction failure and reported separately (task C13), so we never pretend the engine judged it.

### 5.3 CI causes and actions

**Causes:** `flaky`, `dependency`, `bug`, `infra`.

**Actions:**

- `rerun`: run the job again. Correct when the cause is `flaky`.
- `auto-fix`: in FYP-1 this is only a *recommendation* that a dependency fix is the right next step. Nothing is changed. It is correct only for `dependency`, and only allowed with exactly one attributed commit.
- `escalate`: give it to a person. Correct for `bug` and `infra`.

A real **code bug always goes to a human**. We do not claim the agent can fix application bugs. In FYP-2 the agent may *open* a fix pull request, but it never merges one. The PR body must include `confidence_score` and `reasoning_trace`.

### 5.4 The four CI evidence groups

| Group | States | What it asks |
|---|---|---|
| `failure_kind` | the 7 kinds above | What kind of error does the log show? |
| `dependency_change` | `changed` / `unchanged` | Did a recent commit change a dependency file? |
| `code_link` | `failing_file_touched` / `not_touched` | Did a recent commit change a file that is failing? |
| `log_coverage` | `truncated` / `complete` | Did we cut the log? |

`log_coverage` has the same numbers for every cause, so it **never changes the probabilities**. It only records the cut in the trace. The audit suggests moving it out of the maths.

All four CI priors are 25%. We have no trustworthy data on how common each cause is, so we do not pretend to know. The CI result therefore comes entirely from the evidence.

---

## 6. Inside the ConfidenceEngine

The engine is plain decision logic. It does not launch a browser, call Groq, read files, or learn while running. The pipelines collect evidence, the adapters organise it, and the engine calculates.

It has three stages:

1. **Estimate causes from evidence** with Bayes' rule.
2. **Remove unsafe actions** with hard blocks.
3. **Compare the remaining actions by expected loss** and pick the cheapest. Escalation is always available.

### 6.1 An honest note about the engine

The calculations are established methods: Bayesian probability (a semi-naive Bayes model) followed by a minimum-expected-loss decision, with a reject option (escalate). It is not a new learning algorithm, and it does not train itself. Its value is in how the project applies these methods:

- browser and log evidence;
- grouping related clues;
- the cost of a wrong action at each risk level;
- hard safety rules;
- escalating when acting is unsafe;
- one engine shared by two domains.

The value has to be shown by evaluation, not by the maths alone (section 9).

### 6.2 Bayes' rule, with QA numbers

Bayes' rule updates a belief when evidence arrives. Start with a guess about the causes (the **prior**), then adjust it by how likely the observed evidence would be under each cause (the **likelihood**). The result is the **posterior**.

QA priors in `weights.yaml`:

- stale selector: 70%
- likely regression: 15%
- flaky: 15%

Suppose a relocated button was clicked, the expected result appeared, and there were no runtime failures. Using two of the QA evidence groups:

| Cause | Prior | Chance of 0 runtime failures | Chance expected state is reached |
|---|---:|---:|---:|
| stale selector | 0.70 | 0.90 | 0.90 |
| likely regression | 0.15 | 0.30 | 0.10 |
| flaky | 0.15 | 0.90 | 0.85 |

Multiply across each row:

- stale selector: `0.70 × 0.90 × 0.90 = 0.567`
- likely regression: `0.15 × 0.30 × 0.10 = 0.0045`
- flaky: `0.15 × 0.90 × 0.85 = 0.11475`

Divide each by the total, `0.68625`. That gives about **83% stale selector, under 1% likely regression, 17% flaky**.

This shows the mechanics, not the truth about real websites. The numbers are configured assumptions. The real engine uses all five QA groups: `runtime_failure`, `state_progression`, `console_noise`, `action_outcome` and `timing`.

### 6.3 Why are some clues grouped?

One broken click handler might cause a page error, an error banner and a failed request. Those are really one underlying problem. Counting them as three separate pieces of evidence would make the engine overconfident. So related signals are grouped and counted once.

The model still assumes that *groups* are independent of each other once you know the cause. This is a modelling choice, not a fact. One known effect: in the "silent no-op" case (the click does nothing), the engine *diagnoses* `stale_selector`. `heal` is still correctly blocked, because the expected result was not reached.

### 6.4 Probabilities are not mistake costs

Probabilities say what is likely. **Costs (losses)** say how bad each mistake is. For a low-risk QA step:

- heal when it really is a stale selector: cost 0;
- heal over a real regression: cost 5;
- escalate a harmless stale selector: cost 1.

These are relative points chosen by people, not dollars. For a high-risk step such as payment, healing over a regression costs **100**. So the same evidence can justify healing a reversible step but escalating a payment step.

**Expected loss** of an action = for each cause, (cost of that action if the cause is true) × (probability of that cause), all added up. The engine picks the lowest.

### 6.5 Worked CI example with the real numbers

The log says `could not resolve dependency`, so `failure_kind = dependency_resolution`. One recent commit changed `package-lock.json` (`dependency_change = changed`), and it did not touch the failing files (`code_link = not_touched`). The log is complete. The `log_coverage` value is 0.90 for every cause, so it cancels and is left out.

| Cause | Prior | failure_kind | dependency_change | code_link | Product |
|---|---:|---:|---:|---:|---:|
| flaky | 0.25 | 0.03 | 0.10 | 0.85 | 0.000638 |
| dependency | 0.25 | 0.45 | 0.80 | 0.55 | 0.049500 |
| bug | 0.25 | 0.02 | 0.35 | 0.20 | 0.000350 |
| infra | 0.25 | 0.03 | 0.20 | 0.90 | 0.001350 |

The total is 0.051838. Dividing gives about **95.5% dependency, 2.6% infra, 1.2% flaky, 0.7% bug**.

CI costs (one tier, `default`): a wrong action costs 10, escalating a case we could have handled costs 2, and a correct action costs 0.

- `rerun` = 10 × (all except flaky) ≈ 10 × 0.988 = **9.88**
- `auto-fix` = 10 × (flaky + infra) ≈ 10 × 0.038 = **0.38**
- `escalate` = 2 × (flaky + dependency + bug) ≈ 2 × 0.974 = **1.95**

The lowest is `auto-fix`, **as long as exactly one commit is attributed**. If two commits changed dependency files, `auto-fix` is blocked and the answer becomes `escalate`.

Rule of thumb from these costs: the engine acts only when it is roughly 80% or more sure the action is right. Below that, escalating is cheaper.

> Known flaw (audit 2026-11-02): the CI cost table still gives `auto-fix` a cost of 0 when the cause is `bug`. So with, say, 55% dependency and 44% bug, it would still auto-fix. The fix is to give `auto-fix` under `bug` a real cost (10 or more). The project owner must approve that change.

### 6.6 Hard blocks: rules that beat the probabilities

Before costs are compared, some actions are removed completely, and no probability can bring them back.

- **QA** (`QAAdapter.blocked_actions`): `heal` is blocked when the replacement matched 0 elements, more than 1, or an unknown number, or when the expected result was not reached.
- **CI** (`CIAdapter.blocked_actions`): `auto-fix` is blocked when the commit is ambiguous, unknown or missing.
- **Both** (`engine.py`): every autonomous action is blocked when:
  - **no evidence** was observed, or
  - the pattern is **unrecognised**: it fits none of the causes well. That measure is called *fit*, and the limit is `unknown_pattern_floor` (0.10 for QA, 0.05 for CI). Example: a page that throws an error *and* reaches the expected result is odd under every cause.
- **CI, for now:** if the most probable cause is `bug`, every autonomous action is blocked (task C15).

`escalate` is never blocked. That is how "every failure path ends in escalate" is guaranteed.

### 6.7 What the engine returns

The full contract is in `docs/contracts/engine_io.md`.

| Field | Meaning |
|---|---|
| `classification` | The most probable cause. **Diagnosis only**, never an action name. |
| `diagnosis_reliable` | `false` when the evidence does not support naming a cause: no evidence, an unrecognised pattern, or no clear winner. A 4-way tie at 25% still names a cause (the first in the list), but this flag is `false` and the UI says so. |
| `recommended_action` | Set only by the cost policy, after the blocks. |
| `confidence_score` | 0–100, based on the probability behind the best action. Read it as "how sure about the action choice", **not** "chance the diagnosis is right". |
| `reasoning_trace` | Plain text: evidence states, probabilities, blocks, expected losses, the choice. |

One sentence to remember: *classification says what happened, recommended action says what to do, and diagnosis-reliable says whether to trust the first answer.*

---

## 7. How to read the two YAML files

### 7.1 `tests/scenarios/qa_scenarios.yaml`: the test recipe plus the answer key

It says:

- which page to open;
- which action and selector to try;
- what result to expect;
- how risky the step is;
- the correct cause and acceptable actions for scoring.

### 7.2 `src/core/weights.yaml`: the engine's assumptions and costs

It has a `qa:` block and a `ci:` block, each with:

- `hypotheses`: the possible causes.
- `priors`: starting probabilities.
- `groups`: evidence types, their states, and the chance of each state under each cause.
- `actions`: which causes make each autonomous action correct.
- `loss` (under `thresholds`): the cost of each action under each cause, per risk tier.
- `unknown_pattern_floor`: the "fits nothing" guard.

The loader checks that every value is present and valid: probabilities sum to 1, and names match the adapters. **Missing or invalid weights raise an error.** Nothing is ever filled in silently. `make weights` runs this check.

## 8. Where do the numbers come from, and do they learn?

**They do not learn.** The values are fixed and do not change after a run.

**Who made them (say it exactly like this):**

- **QA probabilities:** drafted with AI help, then reviewed by the team.
- **CI probabilities:** proposed by the AI agent (task C9). They are marked provisional and not calibrated.
- **CI costs:** approved by Shazil on 2026-10-27.

The rationale is in `docs/contracts/weights_elicitation.md` and `docs/contracts/ci_weights_elicitation.md`.

**Calibration** means estimating the likelihood numbers from human-labelled cases, then testing them on a **held-out** set that was never used for fitting. Two rules:

- **Costs stay human decisions.** Data cannot decide how costly a missed bug is to a team.
- **Never tune on the evaluation cases.** The frozen QA comparison must not be used to adjust QA weights.

**CI calibration is task C12, and it is blocked.** The reviewed dataset has only 3 `flaky` cases. Holding even one out leaves almost nothing to fit, so any result would be meaningless. The plan is to collect and review more flaky cases after the demo. QA calibration is FYP-2 work.

Outside datasets that may help QA later: [ReproBreak](https://github.com/rub-sq/ReproBreak) (reproducible web locator breaks) and [IDoFT](https://github.com/TestingResearchIllinois/idoft) (flaky tests). Neither provides all the browser evidence and labels we need, so check their fit first.

**Sensitivity check** (`make sensitivity`, `src/core/sensitivity.py`). It moves each likelihood up and down by 50% and checks whether any decision flips. On the reference cases there were 0 flips (audit 2026-10-27). So decisions do not depend on one guessed number. Priors and costs are not perturbed yet.

---

## 9. Benchmarks, ground truth and results

### 9.1 Ground truth

**Ground truth** is the human answer key for one case, written **before** the run. It is not a probability. For QA, each step's `truth` has:

- `cause`: what the case represents, e.g. `likely_regression`;
- `acceptable`: which actions a reviewer accepts, e.g. only `escalate`.

The engine produces its own answer, and the evaluator compares the two.

### 9.2 The QA benchmark: 20 scenarios, 22 steps

`tests/scenarios/qa_scenarios.yaml` contains:

- **`shopflow_checkout`**: 3 steps (add to cart, apply promo code, pay) on a local demo shop.
- **9 `lab_*` scenarios**, 1 step each, on local demo pages:
  - `rename_ok`
  - `rename_crash`
  - `error_banner`
  - `silent_noop`
  - `slow_render`
  - `console_noise_low`
  - `console_noise_high`
  - `tracking_404`
  - `ambiguous`
- **10 `b1_*` scenarios** on a real open-source app, **Modern TodoMVC** (task B1). They cover five changes (renamed, renamed plus a throwing handler, renamed but doing nothing, a failing request, slow rendering), each on two buttons (delete and toggle). The project owner approved these labels on 2026-11-02, before the run.

These are controlled cases built by the team. They check that the pipeline behaves correctly. They do not prove it generalises to every real app.

### 9.3 The CI dataset: 206 reviewed cases

`tests/ci_corpus/` holds real historical GitHub Actions failures (task C3). Each case has a `case.yaml` and a log. The human-reviewed labels are:

- `bug`: 69
- `infra`: 68
- `dependency`: 66
- `flaky`: 3

A few cases are unlabelled (`label: null`) and must be excluded.

The sources include **BUMP** (breakages caused by dependency updates), **lca** (CI failures that were fixed by code changes), and real runs from projects such as **pytest-dev**. Importer scripts suggested the labels from the source data, and the human owner approved them before they were set. Agents are never allowed to invent labels.

Two things everyone must be able to explain:

1. **Labels follow their source.** lca cases are all `bug`, and BUMP cases are all `dependency`. So an engine could partly be "recognising the dataset" (log style, language) instead of the cause. Report results per source, and name this as a threat to validity.
2. **Only 3 `flaky` cases.** We cannot say anything about flaky CI failures yet.

Also decided but not applied yet (it goes into C12 with an ADR 006 addendum): `flaky` is defined by mechanism, and `rerun` will also count as correct for *transient* `infra`, such as a runner timeout.

The fixed 2-case smoke-test fixtures live separately in `tests/fixtures/ci_cases/`.

### 9.4 How evaluation works

Run the same cases through TriageCore and through simpler **baselines**, then compare with the answer key. If TriageCore cannot match or beat a simple rule, the extra machinery is not justified.

**QA baselines** (`src/eval/evaluate.py`):

- `blind_heal`: always heal, like a naive self-healing tool.
- `penalty_rule`: a points-based rule.
- `simple_rule`: the strongest obvious hand rule. Heal only on one match, the expected result reached, and no errors.
- `llm_judge`: just ask the LLM (`src/eval/llm_judge.py`).
- `triagecore`: our engine.

**CI baselines** (`src/eval/evaluate_ci.py`):

- `rerun_all`: always rerun.
- `keyword_rule`: regex on the log.
  - `timeout|ECONNRESET|503` → rerun
  - `npm ERR|ModuleNotFoundError|could not resolve` → auto-fix
  - otherwise → escalate
- `triagecore`.

**Metrics:**

- accuracy (the action is acceptable);
- masked regressions (the worst error);
- needless escalations;
- cause accuracy;
- extraction failures (CI);
- timing.

Every rate has a **95% confidence interval** (Wilson interval, `src/eval/stats.py`). It shows honestly how uncertain a number is when there are few cases.

### 9.5 Results we can cite

Cite **only frozen results**: files in `results/frozen/` named with the git commit they came from, and never edited. `results/*_latest.json` is overwritten by every run, so do not cite it.

**QA, frozen 2026-11-02** (22 steps, 10 real regressions):

| Policy | Correct actions | Masked regressions |
|---|---:|---:|
| blind_heal | 9 / 22 | 10 / 10 |
| penalty_rule | 19 / 22 | 0 |
| simple_rule | 21 / 22 | 0 (1 needless escalation) |
| **triagecore** | **22 / 22** | **0** |

TriageCore cause accuracy: 86%.

How to say it honestly:

- Blind healing is clearly dangerous: it hid every regression.
- TriageCore and the simple rule are close (22 vs 21, with overlapping confidence intervals).
- The claim is: *TriageCore matches the best hand rule, never masks a regression, and also diagnoses the cause, explains itself, and adjusts to risk through costs, in one engine shared with CI.*
- The claim is **not** "much more accurate".

**CI so far:** only a **2-case smoke test** on the hand-made fixtures. TriageCore got 1 of 2, the keyword rule 2 of 2, and `rerun_all` 0 of 2. This shows the pipeline runs end to end. It is **not** evidence that CI triage works.

The most important open step (audit 2026-11-02): evaluate the CI engine on the 206 reviewed cases, per source and per cause, then freeze the result. This is allowed now, because the CI weights were never fitted on that data. Write down which cases were used, so C12's later holdout stays clean.

---

## 10. The supporting pieces

- **Decision database** (`src/db/store.py`, task S1). SQLite (`triagecore.sqlite3`) stores every decision with its input, output and trace. `GET /api/qa/decisions` lists them. It is also the future data source for calibration in FYP-2.
- **GitHub webhook** (`src/ci/webhooks.py`, task C5). This is the endpoint GitHub calls when a workflow run fails. It checks the `X-Hub-Signature-256` signature **first**:
  - invalid signature → 401;
  - malformed body → 400;
  - no secret configured → 503;
  - never a 500 on bad input.

  In FYP-1 it records the job. Live triage is FYP-2.
- **API** (`src/api/app.py`, `qa_routes.py`, `ci_routes.py`). One FastAPI app serves `/api/qa/*`, `/api/ci/*` and the built frontend. The old scripted demo routes sit under `/api/legacy/*`. Handlers that use Playwright are plain `def`, not `async def`.
- **UI** (`frontend/src/`):
  - **QA Engine:** live runs, including TodoMVC with an app preview link.
  - **Evaluation:** baselines, confidence intervals and charts.
  - **CI Engine:** reviewed cases with a searchable catalogue, source filters, quick-start cases, the reliability label and escalation reasons.
  - **`legacy/`:** the proposal-time scripted demo with hardcoded numbers. Never cite or extend it.
- **Secrets** (`GROQ_API_KEY`, the webhook secret) live only in `.env` (see `.env.example`). Never print or commit them. Without a Groq key, every renamed QA step escalates. That is the fail-safe working as designed, not a bug.
- **Commands** (repo root):

  | Command | What it does |
  |---|---|
  | `make setup` | install everything |
  | `make test` | run all tests |
  | `make test-engine` | fast engine tests only |
  | `make lint` | ruff |
  | `make weights` | validate `weights.yaml` |
  | `make sensitivity` | sensitivity check |
  | `make eval` | QA evaluation (needs a Groq key) |
  | `make api` | API on port 8000 |
  | `make ui` | UI on port 5173 |
  | `make verify` | tests, weights and frontend checks |

## 11. Status board

**Done in FYP-1:**

- Cleanup and repository CI (A1–A6).
- Audit fixes (X1–X6).
- Decision store (S1).
- QA safety and patch suggestion (A4, Q1).
- Evaluation upgrades: confidence intervals, simple rule, timing, LLM judge (B2, Q4, Q2, Q3).
- The whole CI lane: contract, `rerun`, truncation, webhook, commit tracing, fact extraction, adapter, weights, pipeline, screen (C1, C2, C4–C11).
- Real-app QA and the live TodoMVC demo (B1, Q5).
- The 206-case CI dataset (C3).
- Extraction-failure reporting (C13).
- Frozen QA rerun (B3).
- Reviewed CI cases in the demo (C14).
- CI clarity and the reliability flag (C15).

**Blocked:**

- **D1:** Docker deployment on a VM with an API token. Waiting for a human to create the VM. Add the token before anything is public, because the run and evaluate endpoints spend Groq credits.
- **C12:** final CI calibration. Waiting for more flaky cases, after the demo.

**Human work still open:**

- Each member fills their row in `docs/disclosure.md` §2: what the AI did, what you changed, how you checked it, and one AI mistake you caught.
- Rewrite `docs/spec.md` and `docs/plan.md` in your own words. Both are still AI-drafted.
- Make every member's contribution visible. The CI owner in particular must be able to explain the CI modules and the cost approvals.

**FYP-2** (`docs/fyp2.md`; do not build it now):

- live CI from the webhook;
- opening fix PRs (never merging);
- a bigger benchmark with calibration;
- user acceptance testing.

## 12. Known limitations (say these before an examiner does)

1. The QA benchmark is small (22 steps) and built by the team, although the labels were written before the run.
2. On QA, TriageCore vs the simple rule is close. The value is safety, explanation and the shared design, not raw accuracy.
3. There is no real CI evaluation yet, only the 2-case smoke test.
4. CI labels follow their source dataset, and there are only 3 flaky cases.
5. The weights are provisional and AI-assisted. Neither set has been fitted on data yet.
6. Evidence groups are assumed independent. The silent no-op case is misdiagnosed, but it is safely blocked.
7. Groq sees at most 6,000 characters of HTML and proposes one selector. A single match does not prove it is the right element.
8. The risk tier does not stop the first click on a high-risk step.
9. `confidence_score` describes the action, not the diagnosis.
10. CI leftovers:
    - the bug rule lives inside the engine;
    - `auto-fix` under `bug` costs 0;
    - `log_coverage` carries no information.

    All three are small to fix.

## 13. Questions you will probably be asked

- **"Is this machine learning?"** No training happens while it runs. It is Bayesian reasoning with configured numbers, followed by a cost-based decision. Later, the likelihoods can be estimated from labelled data. The costs stay human decisions.
- **"Why not just ask the LLM?"** We tested that (`llm_judge`). LLM output is untrusted and cannot explain itself in a checkable way. In TriageCore the LLM only *proposes* a selector or log facts. The browser or the schema checks the proposal, and transparent maths decides.
- **"Why Bayes plus expected loss?"** It separates *what is likely* from *how bad each mistake is*. So the same evidence can heal a cheap step and escalate a payment step.
- **"What stops it hiding a real bug?"**
  - Masking costs a lot.
  - Hard blocks: the expected result must be reached, and there must be exactly one element or one commit.
  - The unknown-pattern guard.
  - Escalate is always available.
- **"Does it change my tests or merge code?"** Never. Heal applies to the current run plus a suggested patch. In FYP-2 the CI agent may open a PR but never merges it.
- **"Where do the numbers come from?"** From the elicitation documents. Say clearly who drafted them (AI-assisted) and who reviewed and approved them.
- **"Why is C12 not done?"** Calibrating with 3 flaky cases would produce numbers nobody can test fairly. Waiting is the honest choice.
- **"Is the engine really shared?"** Yes. The same Bayes, blocks and cost code run for both sides, with one adapter and one weights block per domain. There is one CI rule still inside the engine, and moving it out is planned.

## 14. Glossary

| Term | Plain meaning |
|---|---|
| Adapter | Turns one domain's raw clues into evidence states (`QAAdapter`, `CIAdapter`). |
| Evidence group | Related clues counted once (e.g. `runtime_failure`, `failure_kind`). |
| Prior | Belief about the causes before the evidence. |
| Likelihood | "If this cause were true, how often would we see this clue?" |
| Posterior | Belief about the causes after the evidence. |
| Fit | How well the evidence matches any cause at all. Low fit means an unrecognised pattern. |
| Loss / cost | How bad an action is if a given cause is true. Relative points, set by people. |
| Expected loss | Cost averaged over the causes, weighted by their probabilities. The lowest wins. |
| Hard block | A rule that removes an action regardless of the probabilities. |
| Risk tier | How dangerous a QA step is (`low`/`medium`/`high`). It changes the costs. |
| Escalate | Hand the case to a person. Always allowed. |
| Heal | Use the replacement selector for this run, and suggest a patch. |
| Masked regression | A real bug the system let through. The worst mistake. |
| Attributed commit | The single commit a CI failure is traced to. Two or more candidates means `ambiguous_commit`. |
| Baseline | A simpler method we compare against. |
| Ground truth / label | The human answer key, written before the run. |
| Held-out set | Cases never used for tuning, kept only for testing. |
| Calibration | Fitting likelihoods on labelled data, then checking them on held-out data. |
| Confidence interval | The honest range a measured rate could plausibly be in. |
| Frozen result | A results file tied to a git commit and never edited. The only kind we cite. |
| Fixture / smoke test | Small hand-made cases that check the pipeline runs, not proof that it works. |
| Webhook | GitHub calling our server. It must be signature-checked first. |

## 15. Where to look in the repository

| If you want to understand… | Start here |
|---|---|
| Purpose and FYP-1/FYP-2 scope | `docs/brief.md` |
| Required behaviour (FR/NFR) | `docs/spec.md` |
| Architecture and decisions | `docs/plan.md`, `docs/adr/` |
| Task order and status | `TODO.md` |
| Current state and blockers | `docs/progress.md` |
| Latest architecture audit | `.agents/tasks/architecture-audit-2026-11-02.md` |
| Engine input/output contract | `docs/contracts/engine_io.md` |
| QA evidence keys | `docs/contracts/raw_signals.md` |
| Browser step collection | `src/browser/runner.py` |
| Selector proposal | `src/browser/relocator.py` |
| QA orchestration | `src/agents/qa_pipeline.py` |
| CI orchestration | `src/agents/ci_pipeline.py` |
| Log truncation | `src/ci/truncate.py` |
| LLM log facts and their schema | `src/ci/facts.py` |
| Commit attribution | `src/ci/tracing.py` |
| Webhook | `src/ci/webhooks.py` |
| Adapters, hard blocks, Bayes | `src/core/evidence.py` |
| Expected-loss choice | `src/core/decision.py` |
| Full engine flow and reliability | `src/core/engine.py` |
| Probabilities and costs | `src/core/weights.yaml` |
| Weight rationale | `docs/contracts/weights_elicitation.md`, `docs/contracts/ci_weights_elicitation.md` |
| Decision database | `src/db/store.py` |
| QA scenarios and labels | `tests/scenarios/qa_scenarios.yaml` |
| Reviewed CI cases | `tests/ci_corpus/` |
| QA / CI evaluation | `src/eval/evaluate.py`, `src/eval/evaluate_ci.py` |
| Confidence intervals | `src/eval/stats.py` |
| Frozen results | `results/frozen/` |
| API routes | `src/api/qa_routes.py`, `src/api/ci_routes.py` |
| UI screens | `frontend/src/qa/`, `frontend/src/ci/` |
| FYP-2 plan | `docs/fyp2.md` |

## 16. The final mental model

```text
QA test step                         failed CI job (saved log + commits)
     ↓                                          ↓
browser observes                     log trimmed, secrets masked,
(LLM proposes 1 selector)            LLM extracts facts, schema checks them,
                                     commits traced (one or ambiguous)
     ↓                                          ↓
QAAdapter organizes                  CIAdapter organizes
                 ↘                  ↙
             ConfidenceEngine (shared)
       Bayes → hard blocks → expected loss
                        ↓
 cause + reliable? + action + confidence + trace
                        ↓
     saved (SQLite) · shown (UI) · scored (evaluator vs human labels)
```

- The LLM **proposes**.
- The browser and the schema **check**.
- The adapters **organise**.
- The engine **reasons**.
- The cost policy **decides**.
- A person **approves anything that changes code**.
- The evaluator **tells us honestly whether all of that beats a simple rule**.

The whole project protects one decision: *is there enough evidence to act automatically, or should a person take over?*
