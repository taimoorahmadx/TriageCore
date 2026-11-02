# TriageCore architecture audit #3 (FYP-1 end), 2026-11-02

Read-only audit of `main` at `23a1728` (merge of PR #18, `feature/ci-engine-clarity`). Nothing in the
repo was changed except this file. Follows `architecture-audit-2026-10-25.md` (A1) and
`architecture-audit-2026-10-27.md` (A2).

Budget note: this pass was short. I did **not** rerun `make test`, `make lint` or the UI. Claims below
come from files and small commands listed in §1. Items marked *(not verified)* were not re-read.

---

## 0. Executive verdict

**No redesign needed.** The module structure (pure `src/core`, adapters, pipelines, API, SQLite store)
is right and is the correct base for FYP-2. Since A2 you closed most P0 items: QA rerun and frozen with
CIs (B3), extraction failures reported (C13), a 206-case reviewed CI corpus (C3), `diagnosis_reliable`
added to the contract (C15), `auto-fix` no longer "correct" for `bug`.

**Three things still need attention before the viva, in this order:**

1. **The CI engine has never been evaluated on the CI corpus.** The only CI result is still the
   2-fixture smoke run (`results/ci_eval_latest.json`, `fixture_count: 2`, TriageCore 1/2, keyword rule
   2/2). The 206 reviewed cases are used for the demo (C14), not for measurement. Evaluating the
   *provisional, unfitted* C9 weights on the corpus is not calibration, so it is **not blocked by C12**.
   This is the single biggest gap in the CI story.
2. **The `bug` fix was done as a special case inside the shared engine, and the loss table still says
   auto-fixing a bug is free.** See §3.1. This is both an architecture smell (it weakens the
   "domain-agnostic engine" thesis) and a policy bug (auto-fix can be chosen while P(bug) is high).
3. **The CI corpus labels are confounded with their source dataset.** `progress.md` records that lca
   cases are all `bug` and BUMP cases are all `dependency`. An examiner will ask whether the engine is
   detecting the cause or detecting the dataset. See §4.2.

Plus the human items that have been open since A1: disclosure §2 rows, spec/plan still AI-drafted,
CI owner visibility (git shows `Shazil05` with **1** commit vs 96 + 17 + 15 for the others).

**Grade-style view (vs A2):** engineering A- (=), method B+ (=), evaluation evidence QA B / CI C-
(QA up, CI unchanged), process and docs B- (=). Overall: **solid pass, good grade if CI evidence and
the human items are closed.**

---

## 1. What I checked

| Check | Result |
|---|---|
| `git log -1` | `23a1728` on `main` = `origin/main` |
| `git shortlog -sn --all` | Taimoor Ahmad 96, Taimoor 17, AbdulMohaimin4 15, **Shazil05 1** |
| `results/frozen/` | one QA freeze: `2026-11-02_ef97bea…json` |
| Frozen QA summary (22 steps, 10 regressions) | triagecore 22/22 (CI 0.85–1.00), simple_rule 21/22 (1 needless escalation), penalty_rule 19/22, blind_heal 9/22 (masks 10/10). TriageCore `cause_accuracy` 0.86 |
| `results/ci_eval_latest.json` | `preliminary_fixture_smoke`, 2 cases, 0 extraction failures, TriageCore 1/2, keyword_rule 2/2, rerun_all 0/2 |
| `tests/ci_corpus/` | 210 dirs; labels bug 69, dependency 66, infra 68, **flaky 3**, **null 3** |
| `grep ci_corpus src/eval Makefile` | **no hits**: no evaluation reads the corpus |
| `src/core/weights.yaml` ci block | read in full (see §3) |
| `src/core/engine.py:100-101` | `if spec.name == "ci" and classification == "bug": … escalate` |
| `ls Dockerfile*`, `grep API_TOKEN src/api` | none (D1 not started, expected) |

---

## 2. Delta vs A2 (2026-10-27)

| A2 item | Status | Evidence |
|---|---|---|
| P0 rerun + freeze QA with all baselines and CIs | **Fixed** | `results/frozen/2026-11-02_<sha>.json`, includes `simple_rule`, Wilson CIs. *(`llm_judge` presence not verified in the summary I printed.)* |
| P0 CI extraction failure reported | **Fixed** | `extraction_failure_count`, `pipeline_error_count` in the CI report (C13) |
| P0 real CI corpus | **Built, not evaluated** | 206 reviewed cases; no eval uses them (§0.1) |
| P0 disclosure honesty | **Open (human)** | `progress.md` Blockers still lists §2 rows |
| P0 CI owner visibility | **Open (human)** | 1 commit |
| P1 redefine `auto-fix` | **Half done** | `actions: auto-fix: [dependency]` and `_CORRECT_ACTION["bug"]="escalate"`, but loss `auto-fix.bug = 0` and an engine special case (§3.1) |
| P1 `unknown` / `diagnosis_reliable` | **Fixed** | `src/core/models.py:14` |
| P1 `always_escalate` + total cost metric | **Not verified** | not seen in the summaries printed |
| P1 remove `log_coverage` from Bayes | **Open** | still a group with equal likelihoods (comment now admits it is non-discriminating) |
| P1 hide legacy tab | *(not verified)* | |
| P1 report metadata (SHA) | **Partly fixed** | frozen file name carries the SHA; CI report has no SHA/weights hash/model id |
| P2 move `FixedFactExtractor`/`FixedJudge` to tests | *(not verified)* | |
| P2 sensitivity on priors/losses, CI cases | *(not verified)* | |

---

## 3. Architecture

### 3.1 A domain rule leaked into the shared engine (fix this)

`src/core/engine.py:100`:

```python
if spec.name == "ci" and classification == "bug":
    policy_reason = "CI policy requires a bug diagnosis to escalate in FYP-1"
```

Why it matters:

- **Thesis.** The project's main claim is one domain-agnostic engine. A `spec.name == "ci"` branch in
  `src/core` is exactly what an examiner will point at. Domain rules already have a proper home:
  `EvidenceAdapter.blocked_actions` (used for `heal` and `ambiguous_commit`).
- **Policy bug.** The loss table still has `auto-fix: {…, bug: 0, …}`. Expected loss of `auto-fix` is
  therefore `10·P(flaky) + 10·P(infra)` and ignores P(bug). Example: P(dependency)=0.55, P(bug)=0.44,
  P(flaky)=P(infra)=0.005 gives E[auto-fix]=0.1, E[escalate]≈1.99, so the engine **auto-fixes while it
  thinks there is a 44% chance the cause is an application bug**. The special case only fires when
  `bug` is the single most probable cause, which is the wrong test. Minimum expected loss is your
  method; use it.
- **Fix (small, owner must approve the loss value, AGENTS rule 1):** set `auto-fix.bug` to the same
  cost as other wrong actions (10, or higher, since fixing the wrong thing on a real bug is the worst
  CI mistake), and delete the `engine.py` special case. If you want a hard rule as well, put
  "block auto-fix when classification is bug" in `CIAdapter.blocked_actions`. Add one test with the
  0.55/0.44 split above. Record it as an ADR 006 addendum.

### 3.2 `log_coverage` is still dead weight in Bayes

Equal likelihoods for every cause means it can never move the posterior. It inflates the group count
and clutters the trace. Move truncation to `blocked_actions` (e.g. block `auto-fix` on truncated logs)
or to a trace note. Low effort, removes an easy viva question ("why is this evidence?").

### 3.3 `flaky` vs `infra` overlap

The owner-approved change (`progress.md`: "`rerun` is also correct for transient `infra`") is not
applied yet and is parked in C12. Until then, the CI likelihoods for `network_or_timeout` and
`runner_or_resources` are split between `flaky` (0.45/0.35) and `infra` (0.20/0.50), and the only
action for `infra` is `escalate`. That is why the hosted-runner-timeout fixture fails. Applying the
*action* change (`rerun: [flaky, infra-transient]` or similar) is a policy decision, not calibration,
and could be done before the demo if the owner wants. Applying it after the demo is also fine, but
then say clearly in the report that CI `infra` handling is escalate-only in FYP-1.

### 3.4 What is still good (keep it)

- `src/core` is I/O-free; adapters own domain logic; engine checks adapter groups against YAML at start.
- Hard preconditions (`heal` needs one element and expected state reached; `auto-fix` needs one
  attributed commit) are in code.
- LLM output is schema-validated; secrets masked before the LLM; webhook verifies HMAC first.
- SQLite store as the single decision log is the right base for FYP-2 calibration.

---

## 4. Evaluation and method (what an examiner will attack)

### 4.1 QA: now defensible, but say it plainly

- TriageCore 22/22 vs `simple_rule` 21/22. The difference is **one step**, and the CIs overlap
  (0.85–1.00 vs 0.78–0.99). Do not claim "TriageCore is more accurate". Claim: *matches the best hand
  rule on decisions, never masks a regression, and adds a cause diagnosis (0.86), an explanation, and
  cost-tunable behaviour shared across domains.* That is honest and still a good contribution.
- Who wrote the 22 labels, and when relative to the weights? Have the answer ready (B1 was meant to fix
  this; state who labelled the real-app cases and that it was before the run).
- `silent_noop` diagnosed as `stale_selector` (A1/A2) is still a known independence limitation. Keep it
  in the report's limitations section.

### 4.2 CI: the corpus has a source confound

- Labels come per source: lca → all `bug`, BUMP → all `dependency`, and (*not verified*) `infra` mostly
  from one other source. Any signal that differs between datasets (log format, language, build tool)
  can predict the label without understanding the failure.
- **What to do:** report results per source, and show the confusion matrix. Mention the confound as a
  threat to validity. If time allows, add a handful of within-source cases with different labels (e.g.
  pytest-dev runs labelled `infra` and `bug`). Do **not** hide it; examiners respect a named threat.
- `flaky` has 3 cases. Any per-cause number for `flaky` is anecdotal. Say so; this is why C12 is
  correctly blocked.
- 3 cases have `label: null`. Make sure every evaluation excludes them explicitly and reports the count.

### 4.3 Run the CI evaluation on the corpus now (P0)

- The C9 weights were not fitted on the corpus, so evaluating them on all 206 reviewed cases is a fair
  **out-of-sample** test of the hand-elicited model. It does not touch C12's rule about fitting.
- Report: TriageCore vs `keyword_rule` vs `rerun_all` (and `always_escalate`), accuracy with Wilson
  CIs, masked count, needless escalations, cause accuracy, extraction failures, per source, per cause.
- Freeze it like B3 (`results/frozen/<date>_<sha>_ci.json`) and add SHA, weights hash and model id to
  the CI report.
- Cost: one Groq extraction per case. If credits are tight, run a fixed stratified sample (e.g. 15 per
  cause, all 3 flaky), chosen by a seeded script before the run.
- **Important for C12 later:** if you evaluate on all 206 now, write down that C12's holdout must be
  re-split from new or untouched cases, or that the C12 fit uses only cases not counted in this run.
  Otherwise the holdout is no longer clean.
- Whatever the result, cite it. If the keyword rule wins, say so and explain why (fact extraction
  quality vs rule brittleness). An honest loss is gradable; a missing result is not.

---

## 5. Deployment (D1) advice

You said Docker deployment is left. Keep it small:

- One `Dockerfile` for the API based on the official Playwright Python image (Chromium already
  installed), and either serve the built frontend as static files from FastAPI or use a second
  nginx stage. One `docker-compose.yml` with a volume for `triagecore.sqlite3` and `results/`.
- **Add the API token before anything is reachable from outside.** `POST /api/qa/run`,
  `/api/qa/evaluate` and `/api/ci/run` spend Groq credits and `/evaluate` overwrites
  `results/qa_eval_latest.json`. Simple bearer token checked by a FastAPI dependency on every
  `POST /api/*` except the webhook (which has its own HMAC). Consider disabling `/evaluate` in the
  deployed build.
- Secrets via env file on the VM, never baked into the image. Run as non-root. Expose only 80/443.
- Webhook: keep the 503 when the secret is unset; document it.
- This is a demo deployment. Do not spend more than a day on it; it earns little marks compared to
  §4.3.

---

## 6. Process, docs, integrity (human work, highest viva risk)

- **CI owner visibility.** Shazil has 1 commit. Individual grading makes this the biggest *personal*
  risk on the team. He should present the CI modules, the corpus review, and the loss approvals in the
  viva, and be able to explain `CIAdapter`, `facts.py` and the loss table line by line. Do not rewrite
  git history; record the actual division of work honestly in `docs/disclosure.md` and the report.
- **Disclosure §2.** Still open. Write it as it happened: "AI proposed the CI probabilities (C9); X
  reviewed; Y approved the losses on 2026-10-27". Accurate beats flattering.
- **spec.md / plan.md** still marked AI-drafted. Each member should own and rewrite at least the
  sections they will be questioned on.
- **Stop adding process.** The TODO/task/progress/log system is already larger than needed. Remaining
  time goes to §4.3, the report, and demo rehearsal.

---

## 7. Direction for FYP-2

The plan in `docs/fyp2.md` (live CI, PRs, calibration, user acceptance) *(not re-read)* fits the
architecture. Do these before FYP-2 code starts, because they get more expensive later:

1. Fix §3.1 (losses decide, adapters block, engine stays generic).
2. Settle the CI action vocabulary (`rerun` for transient `infra`, proposal-only fix actions) in one
   ADR before any PR-opening code exists.
3. Decouple labels from source in the corpus (§4.2) as part of FYP-2 data collection, and grow `flaky`.
4. Version every report (SHA, weights hash, model id, prompt hash).

---

## 8. Prioritised list

| Pri | Effort | Action | Files |
|---|---|---|---|
| P0 | M | Evaluate provisional CI weights on the reviewed corpus (or seeded stratified sample), per source and per cause, with baselines and CIs; freeze it | `src/eval/evaluate_ci.py`, `results/frozen/` |
| P0 | S | Replace the `engine.py:100` CI special case with `auto-fix.bug` loss = 10+ (owner approves) and/or a `CIAdapter.blocked_actions` rule; add the 0.55/0.44 test | `src/core/engine.py`, `src/core/weights.yaml`, `src/core/evidence.py`, `tests/` |
| P0 | S (human) | Disclosure §2 per member; CI owner prepares to own CI in the viva | `docs/disclosure.md` |
| P1 | S | Name the source-label confound and `flaky` n=3 in the report; exclude `label: null` explicitly | report, `evaluate_ci.py` |
| P1 | S | Remove `log_coverage` from Bayes (blocker or trace note) | `weights.yaml`, `evidence.py`, tests |
| P1 | S | Add SHA, weights hash, model id to CI reports | `src/eval/evaluate_ci.py` |
| P1 | M | D1: Dockerfile + compose + bearer token on `POST /api/*` | new files, `src/api/` |
| P1 | S | QA wording: "matches best hand rule (22 vs 21 of 22), never masks, adds diagnosis" | report |
| P2 | S | Decide whether `rerun` for transient `infra` lands before the demo or after (owner) | ADR 006 addendum |
| P2 | S | Re-check A2 P2 items not verified here (stand-ins in `src/`, legacy tab, sensitivity scope) | see A2 §10 |

---

## Plain-language summary

- The architecture is good. Don't redesign it.
- You fixed most of what the last audit asked: QA results are rerun and frozen, extraction failures
  are reported, there is a real reviewed CI dataset, and the engine can now say "diagnosis not reliable".
- **Biggest gap:** you built 206 reviewed CI cases but never measured the CI engine on them. The only
  CI number is still the 2-case smoke test, where a keyword rule won. Run the evaluation on the
  corpus. It is allowed now because the weights were not fitted on it.
- **The "bug → escalate" fix is in the wrong place.** It is an `if ci` inside the shared engine, and
  the cost table still says auto-fixing a bug costs nothing. So the engine can still auto-fix when it
  thinks there is a 44% chance of a real bug. Fix the cost number and delete the special case.
- **Your CI labels match your data sources** (one dataset is all `bug`, another all `dependency`). Say
  this openly and report results per source.
- Only 3 `flaky` cases: don't claim anything about flaky in CI. C12 being blocked is correct.
- QA: TriageCore 22/22 vs simple rule 21/22. That is a tie in practice. Sell explanation, safety and
  shared design, not accuracy.
- `log_coverage` still does nothing in the maths. Move it out.
- Docker: keep it small, and add an API token before the VM is public.
- People: Shazil has 1 commit. He must be able to own and explain the CI part in the viva. Fill in the
  AI disclosure honestly.
