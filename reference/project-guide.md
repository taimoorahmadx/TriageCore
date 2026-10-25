# TriageCore: a plain-language project guide

This guide explains what the project is for, what a user gives it, what it returns, and how its decision engine works. It is written for a teammate who is new to the code and the project vocabulary.

## The short version

When an automated test fails, TriageCore gathers clues about the failure, estimates what probably caused it, and recommends a next step. It can recommend a safe recovery, or escalate the case to a person when acting could hide a real bug or the clues are not strong enough.

The project has two intended uses:

1. **QA:** investigate a failed browser test step.
2. **CI:** investigate a failed GitHub Actions job.

They use different evidence and different cause labels, but are meant to share the same **ConfidenceEngine**. The QA path is the more complete one today. CI is still being built.

## What problem is it trying to solve?

Imagine a browser test clicks a button using the selector `#submit-order`, but the button's ID changed during a UI refactor. The test fails, even though the app may still work.

A basic self-healing tool might find a similar button, click it, and call the test fixed. But what if the click handler now has a real bug? The replacement click might hide a problem the test was supposed to catch.

TriageCore tries to answer two questions separately:

1. **What is the likely cause?** This is the `classification` (diagnosis).
2. **What should happen next?** This is the `recommended_action` (decision).

For example, the likely cause may be `likely_regression`, while the recommended action is `escalate`. A cause is not an action.

## What does a QA user give, and what do they get?

### The input

The user supplies a browser test scenario. In this project, a scenario includes a page to open, an action to take, the original selector used by the test, and a way to check whether the expected result happened. Some steps also specify the risk tier and the part of the page to search for a replacement element.

Here, “test” means a step described in `tests/scenarios/qa_scenarios.yaml` and run by the project's Python Playwright runner. It is **not** currently an ordinary Playwright test file that TriageCore edits. TriageCore also does **not** start with a plain-English request and invent a whole test for the user.

### What is a selector, and what does “heal” change?

A **selector** is a string Playwright uses to find an element on a web page. For example, `#add-to-cart` means “find the element whose HTML `id` is `add-to-cart`.” The `#` is the CSS-selector symbol for an ID. If a developer changes that ID, the old selector no longer finds the button.

If the old selector fails, Playwright reads the current HTML inside the page area named in the scenario, or the whole page body if no area is named. TriageCore sends Groq the old selector, the element's purpose, and at most the **first 6,000 characters** of that HTML. The limit is set by `MAX_HTML_CHARS` in `src/browser/relocator.py`.

That means the browser can read a larger page, but **Groq only sees the portion sent in its prompt**. If the target element is outside the chosen page area, or appears after the first 6,000 characters, Groq may not see it. From the information in the code and project notes, 6,000 is a limit in the current implementation; its reason is not recorded as a reviewed design decision.

Groq is asked for **one** replacement selector. This is not a search that tries many possible selectors. The code may retry the Groq request if the network/API call fails, but it does not ask for more selector guesses because a selector matched the wrong thing. Playwright checks whether the proposed selector matches exactly one element, then clicks it during the current run.

**Exactly one match only proves there is one match. It does not prove that it is the intended element.** For example, a wrong button might be the only button matching a weak selector. The runner observes whether the expected result appears after clicking, but the current code can still send that evidence to the decision engine; a missing expected result is not yet an unconditional block on `heal`.

If Groq cannot see the real target, it may still guess a selector. If that selector matches zero elements, the runner has no element to click and healing is blocked. If it matches several, the runner refuses to choose. If it matches one wrong element, uniqueness alone will not catch the mistake: the runner may click it, then check the observed result. The expected-result hard block is planned in TODO X1 but is not implemented yet. The agent does not keep trying alternative selector guesses.

So `heal` means: **use the replacement selector for this run instead of the old, broken selector.** It does not change the button, write the replacement into `qa_scenarios.yaml`, or permanently repair a Playwright test file. The planned Q1 task adds a suggested patch that a person can review; even that patch is not applied automatically.

### How could we make a wrong replacement safer?

Treat “matches one element” as only the first check, not proof that the replacement is right. Useful safeguards are:

1. **Check what the element is before clicking.** Match the expected role and accessible name/text, and keep the search inside the scenario's specific page section when possible. For example, the target should be the “Add to Cart” button inside the keyboard's product card, not just any unique button on the page.
2. **Require the expected result after clicking.** If the cart count or order confirmation does not change as expected, the run must fail/escalate; it must not count as healed. This hard block is already listed as TODO X1, but is not implemented yet.
3. **Do not automatically click a replacement for dangerous actions.** For actions like payment or deleting data, stop for a human unless the project can guarantee a safe test environment and explicit protections. This is a real gap to address: the current runner clicks a unique replacement to collect post-click evidence before the engine makes its decision, so the risk tier currently does not prevent that first click.
4. **If a check is uncertain, stop after the one proposal.** Do not keep trying guesses until something happens to work; that can click the wrong control and hide the real issue.

The first and third points are safeguards to consider; they are not all implemented or currently listed as completed work. A successful selector check and a successful post-click check reduce risk, but no single check proves correctness in every application.

### What TriageCore does

For each step, the browser runner:

1. Tries the original selector.
2. If it fails, waits briefly and retries it. The page may simply be slow.
3. If it still cannot find the element, asks the Groq-based relocator to propose a replacement selector.
4. Checks that the proposed selector matches exactly one element. It does not choose between multiple matches.
5. Clicks the element it can safely identify and watches for clues: Did the expected result appear? Was there a page error, an error banner, a failed request, or console noise?
6. Sends the evidence and the step's risk tier to the ConfidenceEngine.

### The output

TriageCore returns a likely cause, an action, a confidence score, and a reasoning trace. Depending on the evidence, the action may be:

- `heal`: use the relocated selector for this run. It repairs how this run finds the element; it does not permanently edit the test recipe. The planned patch is only a suggestion for a person to review.
- `flag`: treat the issue as flaky and report it.
- `escalate`: stop and ask a human to investigate.

The important safety problem is a **masked regression**: a real application bug that the system lets pass without a person seeing it.

## What does “CI failure” mean here?

CI means **continuous integration**. When a developer pushes code or opens a pull request, GitHub Actions can automatically run checks such as tests, linting, and builds. A failed check has logs that can help explain the cause.

The CI agent is intended to investigate those failed jobs. It would take a log and run details, extract facts, inspect recent commits, and recommend an action such as rerun or escalate. A future version may propose a fix pull request; it must not merge it automatically.

Two things that are easy to mix up:

- The repository's `.github/workflows/ci.yml` runs checks **on TriageCore itself**.
- The planned TriageCore CI agent analyzes failures from GitHub Actions jobs in projects it is used with.

The CI agent is not complete yet. The current plan keeps it in FYP-1, but several of its components and decisions are still TODOs. The CI weights are disabled until their tables are authored.

## What happens inside the ConfidenceEngine?

The engine is intended to be plain decision logic. It does not launch a browser, call Groq, or learn from past decisions while running. The browser and CI pipelines collect evidence; adapters organize it; the engine calculates a diagnosis and recommendation.

The engine has two reasoning stages:

1. **Estimate causes from evidence.** It uses Bayes' rule to update the probability of each possible cause.
2. **Compare actions by expected loss.** It estimates the cost of each action under those possible causes and chooses the action with the lowest expected cost. Escalation is always an option.

### An honest note about the engine

The calculations are established methods: Bayesian probability followed by a cost comparison. The engine is not a new learning algorithm, and it does not train itself from test runs. Its value is in how the project applies those methods: gathering browser evidence, grouping related clues, accounting for the risk of a wrong action, and escalating when acting is unsafe.

That application still needs to prove its value. The current QA examples are small and controlled, so they do not yet show that the engine makes better decisions than simpler rules on real applications. A strong evaluation on realistic cases is what can make this a convincing project; the math alone does not.

### Bayes' rule, with project numbers

Bayes' rule is a formal way to update a belief when evidence arrives. Start with a guess about the causes, then adjust it according to how likely the observed evidence would be under each cause.

The QA weights currently start with these **priors** (the beliefs before seeing evidence):

- stale selector: 70%
- likely regression: 15%
- flaky: 15%

Suppose a relocated button was clicked, the expected result appeared, and no runtime-failure signals were observed. For a simple illustration, use just two evidence groups from `weights.yaml`:

| Cause | Starting probability | Chance of 0 runtime failures | Chance expected state is reached |
|---|---:|---:|---:|
| stale selector | 0.70 | 0.90 | 0.90 |
| likely regression | 0.15 | 0.30 | 0.10 |
| flaky | 0.15 | 0.90 | 0.85 |

For each cause, multiply its starting probability by the two evidence probabilities:

- stale selector: `0.70 × 0.90 × 0.90 = 0.567`
- likely regression: `0.15 × 0.30 × 0.10 = 0.0045`
- flaky: `0.15 × 0.90 × 0.85 = 0.11475`

Those results do not yet add up to 1, so divide each by their total, `0.68625`. The updated estimates are about **83% stale selector, less than 1% likely regression, and 17% flaky**.

That example shows the mechanics, not the truth about real websites. The numbers in the file are human-chosen assumptions, so the resulting probabilities are only as trustworthy as those assumptions and the evidence model. The engine also uses more groups than the two shown in this simplified example.

### Why are some clues grouped?

One broken click handler might cause a page error, an error banner, and a failed request. Those clues may all come from one underlying problem. If the engine treated them as three fully separate pieces of evidence, it could become overconfident. The QA adapter groups related signals so they do not all count independently.

The model still makes a simplifying assumption: after grouping, evidence groups are treated as conditionally independent for a given cause. That is a modeling choice to examine, not a guarantee about real failures.

### Probabilities are not mistake costs

The engine needs probabilities to estimate what is happening. Separately, it needs costs to say how bad each possible mistake is.

For a low-risk step, the current table assigns:

- cost 0 for healing when the cause is truly a stale selector;
- cost 5 for healing when the app has a real regression;
- cost 1 for escalating a harmless stale-selector issue.

These are relative project values, not measured dollars. For a high-risk action such as payment, the cost of healing over a real regression is set much higher: 100. So the same evidence may justify healing a reversible step but escalating a high-risk one.

The calculation is: for each action, multiply its cost under each cause by the estimated probability of that cause, then add those results. This is the action's **expected loss**. The engine chooses the action with the lowest expected loss, subject to safety blocks. If an action is ambiguous or unsafe, it is removed from consideration.

## What are the 10 scenarios, 12 steps, and “ground truth”?

The file `tests/scenarios/qa_scenarios.yaml` contains **10 scenario entries**:

- `shopflow_checkout` has 3 steps: add to cart, apply a promo code, and pay.
- 9 `lab_*` scenarios have 1 step each.

So the file describes **12 steps total**. The evaluator currently runs each step and scores the triage decisions against the labels. These are controlled examples on local demo pages, not 12 failures collected from real companies. The slow-render case is deliberately included to test whether waiting recognizes a timing issue.

**Ground truth** means the answer key for one deliberately constructed example. It is not a probability. Each step's `truth` records:

- `cause`: what the demo page was designed to represent, such as `stale_selector` or `likely_regression`.
- `acceptable`: which actions a human reviewer considers acceptable for that example.

For example, a page where the button was renamed and its click handler crashes has ground-truth cause `likely_regression`, with `escalate` as the acceptable action. The engine produces its own diagnosis and action; evaluation compares them with this answer key.

Because the pages and labels were constructed by the project team, this benchmark can check that the pipeline behaves on these examples. It cannot by itself show that the method generalizes to real apps.

## How to read the two YAML files

### `tests/scenarios/qa_scenarios.yaml`

Think of it as the **test recipe plus answer key**. It says which page to open, what action and selector to try, what result to expect, how risky the step is, and what cause/action label the evaluator should use.

### `src/core/weights.yaml`

Think of it as the **engine's current assumptions and decision costs**. It contains:

- `hypotheses`: possible QA causes.
- `priors`: starting probabilities for those causes.
- `groups`: evidence types, their possible states, and the assumed chance of each state under each cause.
- `actions`: which causes make an autonomous action considered correct.
- `loss`: the cost assigned to actions when each cause is true, at each risk tier.
- `unknown_pattern_floor`: a guard that escalates evidence patterns that fit none of the modeled causes well.

The loader checks that values are present and valid. It does not learn or silently fill them in.

## Are the weights learned or updated?

No. The QA values are fixed human-authored values today. They do not change after a test run. This is not a model that trains itself in production.

It is reasonable to question whether the probability values are wrong. The TODO now includes a later FYP-1 task to tune the QA evidence probabilities using labeled cases and compare them on held-out cases. A held-out case is one kept out of tuning, used only to check whether the tuned values work on examples the process did not train on.

Do not try to learn reliable values from only these 12 controlled steps. Gather more labeled examples first. Probability tables may be estimated from data; **mistake costs should remain human decisions**, because data cannot decide how costly a missed bug is to your team.

Two possible outside datasets found so far are [ReproBreak](https://github.com/rub-sq/ReproBreak), which focuses on reproducible web locator breaks, and [IDoFT](https://github.com/TestingResearchIllinois/idoft), which focuses on flaky tests. They may help with parts of QA, but neither supplies all the browser evidence and labels this project needs. They would need to be checked for fit before using them to tune values.

## What's built, planned, and limited?

Based on the current TODO and progress files:

- The shared engine and the QA browser pipeline exist.
- The FastAPI app exposes QA routes and serves the frontend.
- The project has local controlled QA scenarios and an evaluation script with baseline policies.
- The CI work, decision database, some QA safety and patch work, stronger evaluation, real-app QA cases, and deployment still have TODOs.
- The current QA examples are small and controlled. Any reported result from them should be described as a result on that suite, not as proof of real-world reliability.
- There was an earlier suggestion in chat to drop CI and focus only on QA. The current project status records **no scope change** and keeps CI in FYP-1, so the guide follows the current repository decision.

## Where to look in the repository

| If you want to understand… | Start here |
|---|---|
| The purpose and FYP-1/FYP-2 scope | `docs/brief.md` |
| Current work and task order | `TODO.md` |
| Current status and decisions | `docs/progress.md` |
| Browser step collection | `src/browser/runner.py` |
| Selector proposal | `src/browser/relocator.py` |
| QA orchestration | `src/agents/qa_pipeline.py` |
| Evidence conversion and Bayes calculation | `src/core/evidence.py` |
| Expected-loss action choice | `src/core/decision.py` |
| Input/output and full engine flow | `src/core/engine.py` |
| Human-authored probabilities and costs | `src/core/weights.yaml` |
| Example scenarios and answer labels | `tests/scenarios/qa_scenarios.yaml` |
| Evaluation and baselines | `src/eval/evaluate.py` |
| API routes | `src/api/qa_routes.py` |

## A final mental model

```text
User's existing test
        ↓
Browser runs it and gathers clues
        ↓
Adapter turns clues into evidence states
        ↓
Engine estimates causes with Bayes' rule
        ↓
Engine compares action costs for the risk tier
        ↓
Heal / flag / escalate, with a trace explaining why
```

The browser **observes**. The adapter **organizes**. The engine **reasons from the configured assumptions**. The policy **chooses an action**. The evaluator **checks the choice against labeled examples**.

The project is trying to make one decision safer: *is there enough evidence to recover automatically, or should a person take over?*
