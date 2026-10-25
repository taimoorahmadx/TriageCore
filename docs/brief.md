# Brief: why and what

The approved proposal is in `docs/proposal.md` (frozen). This page is the current, short version.

## Problem

1. **Browser tests break when selectors go stale.** AI "self-healing" tools find the moved element
   and click it. If the click handler is itself broken, the test still passes and a real bug ships
   (a *masked regression*).
2. **CI failures are triaged by hand.** Someone reads the log, decides flaky vs dependency vs bug vs
   infra, and acts. Re-running everything wastes time; auto-fixing the wrong thing is worse.

Both are the same decision under uncertainty: *is this evidence strong enough to act automatically,
given what it costs to be wrong?*

## What we build

One **ConfidenceEngine** (`src/core/`) used by two agents:

| Agent | Evidence | Causes (diagnosis) | Actions (decision) |
|---|---|---|---|
| QA agent | Browser telemetry after a relocated click | `stale_selector`, `likely_regression`, `flaky` | `heal`, `flag`, `escalate` |
| CI agent | Facts extracted from a failed GitHub Actions log, rerun history, recent commits | `flaky`, `dependency`, `bug`, `infra` | `rerun`, `auto-fix`, `escalate` |

The engine computes P(cause | evidence) with semi-naive Bayes and picks the action with the lowest
expected cost, with `escalate` (hand it to a human) always available. All numbers in the engine are
human-authored. The LLM (Groq) only proposes: a replacement selector, or structured facts from a
log. It never makes the decision.

**Contribution:** the decision engine (evidence grouping, cost-aware decision with a reject option,
risk tiers, hard safety preconditions), the post-action evidence collector, the shared taxonomy, and
an evaluation against baselines on labelled cases.

## Users

Small teams without dedicated QA, open-source maintainers with noisy CI, platform/DevEx teams.

## Scope

| | FYP-1 (now) | FYP-2 |
|---|---|---|
| QA | Engine, collector, relocation, pipeline, UI, evaluation with baselines, suggested selector patch (never auto-applied), decision store | Real-app benchmark at scale, calibration, applying patches as PRs |
| CI | Labelled corpus of real public logs, log truncation, LLM fact extraction, commit tracing, CI weights, CI evaluation, webhook endpoint tested with saved payloads | Live GitHub App, background queue, fix PRs (never merged), live 4-week trial |
| Platform | One FastAPI app, SQLite decision store, one Docker deployment on a VM | Dashboard of decisions, acceptance testing with real projects |

**Out of scope:** visual (screenshot) matching, providers other than GitHub Actions, multi-repo
tracing, auto-merging anything.

## Success criteria

- Real bugs let through by TriageCore (masked regressions): fewer than blind healing and the
  simple-rule baselines, reported with a 95% confidence interval. FYP-2 target: < 5%.
- Needless escalations reported alongside, so "escalate everything" cannot look good.
- Engine decision < 200 ms; QA heal cycle < 10 s; CI triage < 30 s.
- Every decision has an exact reasoning trace and is stored.

## Team

| Member | Owns |
|---|---|
| Taimoor Ahmad (M1) | Evaluation and benchmarks, deployment, repo cleanup |
| Abdul Mohaimin (M2) | ConfidenceEngine, QA agent, browser layer |
| Shazil (M3) | CI agent end to end: corpus, truncation, facts, tracing, CI weights, webhook |

## Glossary

| Term | Meaning |
|---|---|
| Masked regression | A real bug that the system lets through without a human (QA: healed or flagged; CI: rerun or auto-fixed) |
| `stale_selector` | The element was renamed or moved; the app works |
| `likely_regression` | The app itself is broken |
| `flaky` (QA) | The element was only slow to appear |
| `flaky` (CI) | The job fails intermittently; the same commit passes on rerun |
| `dependency` | Failure caused by a changed or broken dependency version |
| `bug` | Failure caused by a code change in the repository |
| `infra` | Failure caused by the runner, network or CI service |
| `heal` | Use the relocated selector (FYP-1: suggest a patch, never write it) |
| `flag` | Keep the original selector and report the step as flaky |
| `rerun` | Re-run the CI job (FYP-1: a recommendation only) |
| `auto-fix` | Propose a fix PR (FYP-2; never merged) |
| `escalate` | Hand the failure to a human |
| Risk tier | `low` / `medium` / `high`: how costly a wrong autonomous action is for this step |
