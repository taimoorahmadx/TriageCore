# 6. CI Scope for FYP-1 and the `rerun` Action

**Date:** 2026-10-25
**Status:** Accepted

## Context
The original plan put a live GitHub App, webhooks, a Redis queue, Postgres, commit tracing via
PyGithub and a cloud deployment before FYP-1 Final. None of the CI side exists yet. Most of that
work is infrastructure, while the marks and the complex computing problem sit in the decision:
classifying a CI failure and deciding whether to act on it. ADR 004 also left open how CI `flaky`
maps to an action, since `rerun` was not in the action enum.

## Decision
1. **FYP-1 CI is an offline vertical slice:**
   - middle truncation of long logs, LLM fact extraction into a fixed schema, commit tracing with
     `ambiguous_commit`, provisional CI weights proposed in C9, the same ConfidenceEngine, and a
     fixture-based preliminary comparison against baselines (`rerun_all`, `keyword_rule`);
   - the reviewed corpus of 30–40 real failed runs and its full benchmark are end-of-FYP-1 tasks
     (C3), after the CI implementation branch is merged, followed by final calibration in C12;
   - `POST /api/ci/webhook` with signature verification, tested with saved payloads; accepted jobs
     are stored, not processed live.
2. **Moved to FYP-2:** live GitHub App, fetching logs on webhook, background queue, fix PRs (never
   merged), the 4-week live trial.
3. **`rerun` is added to `recommended_action`.** It is the natural autonomous action for CI `flaky`.
   `flag` keeps its QA meaning. In FYP-1, `rerun` is a recommendation only.

When C3 is completed at the end of FYP-1, labels come from public run history: same commit failed then passed
on rerun → `flaky`; fixed by a dependency/lockfile change → `dependency`; fixed by a code change →
`bug`; runner, network or service errors → `infra`. Each label is checked by a human before use.

## Consequences
- **Positive:** the shared-engine claim is demonstrated on two domains in FYP-1; M3 owns a
  technically meaningful module; fewer fragile live dependencies in the demo.
- **Negative:** no live CI integration until FYP-2; webhook evidence is from saved payloads only.
- **Contract change:** `ConfidenceEngineOutput.recommended_action` gains `rerun` (task C2).

## Weight calibration amendment (2026-10-27)

CI probability weights may be agent-proposed with documented provenance and used provisionally for
the initial C10 benchmark. Final fitting from human-reviewed training cases and one evaluation on a
holdout untouched by fitting and the initial benchmark occur later in C12. The project owner approves
the policy cost matrix; dataset fitting does not change it.
