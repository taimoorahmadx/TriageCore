# 4. ConfidenceEngine: Bayesian Diagnosis with Minimum-Expected-Loss Decisions

**Date:** 2026-10-11
**Status:** Accepted

## Context
The ConfidenceEngine decides whether an agent may act autonomously or must escalate to a human. It is the project's claimed complex computing problem, so it must not be a hand-tuned `if-else`.

The problem has five properties:
- **The cause is hidden:** a harmless rename, a real regression, or a slow render.
- **The evidence is imperfect:** noisy, correlated (one broken handler produces several symptoms), sometimes missing, and sometimes contradictory.
- **Errors have very unequal costs:** auto-healing a real regression ships a bug; escalating a harmless change costs minutes.
- **Little labelled data:** about 15–50 cases are available.
- **Shared engine:** the same engine must serve QA (3 causes) and CI (4 causes).

A hand-weighted penalty sum, compared against a fixed threshold, was considered first and rejected:
- It double-counts correlated symptoms.
- It treats missing evidence as "fine".
- Its score has no meaning ("why −30? why 85?").
- A two-cause threshold does not generalise to CI's four causes.

## Decision
The engine is built from four parts:

1. **Diagnosis by semi-naive Bayes.**
   - Adapters may pool related signals within a group (for example, the QA runtime-failure indicators).
   - Separate groups are treated as conditionally independent given the cause, so correlation across groups can still affect the posterior.
   - The posterior over causes is computed from documented priors and likelihood tables P(state | cause) in `weights.yaml`; values may be human-elicited or explicitly agent-proposed.
   - Missing evidence is marginalised out.
   - `classification` is the most probable cause, a diagnosis only.
2. **Decision by minimum expected loss, with escalation as the reject option** (Chow's rule).
   - The action minimises Σ loss(action, cause)·P(cause | evidence).
   - The loss table depends on the step's `risk_tier`, so irreversible steps (e.g. payment) need stronger evidence.
   - For a two-way choice this reduces to τ = C_mask / (C_mask + C_escalate). The documents' 85% threshold corresponds to masking being about 5.7 times worse than a needless escalation.
3. **Hard preconditions.**
   - `heal` requires exactly one relocated element; ambiguity is never resolved silently.
   - QA `heal` is blocked when `expected_state_reached` is `false`; `null` means unobserved and does not trigger this block.
   - Evidence that fits no known cause (below `unknown_pattern_floor`) escalates as "unrecognised pattern".
4. **Data, not code.**
   - Causes, groups, actions and costs live in `weights.yaml` and are validated against the contract enums.
   - Placeholders or malformed values raise `RuntimeError`.
   - Missing or malformed values raise; every value records its provenance. Agent-proposed probability tables are provisional until evaluated on held-out labelled data. Policy costs require project-owner approval (AGENTS.md).

**QA causes are extended with `flaky`** (an element that is slow to render), backed by a re-wait of the original selector before relocation. Timing failures were a major E2E failure category in the reviewed literature. This extends AGENTS.md's QA use of the existing enum value; no schema change is needed.

### Weight provenance amendment (2026-10-27)

The original QA values remain human-elicited. For CI, an agent may propose provisional prior and likelihood values in an explicit task, with rationale and source recorded. C12 fits those probability tables from human-reviewed training labels and evaluates them on a holdout fixed before fitting. Policy loss costs remain project-owner decisions; an agent may present options but cannot approve them.

## Alternatives considered

| Alternative | Reason rejected |
|---|---|
| Hand-weighted penalty sum | See Context. Kept as an evaluation baseline |
| Discriminative classifier (logistic regression, random forest) | Needs much more labelled data. FlaKat (Lin et al., 2024) reaches only 0.67 macro-F1 on 1,257 labelled flaky tests. A candidate for FYP-II comparison |
| LLM self-reported confidence | Makes the LLM a core-replacement (FAST Guide §14); LLM confidence is poorly calibrated |
| Dempster–Shafer evidence theory | Known conflict paradoxes; hard to calibrate and explain |
| Fuzzy / multi-criteria scoring | Arbitrary membership functions or weights; scores are not probabilities |
| Learned Bayesian network | Structure learning needs far more data than available |
| Deterministic accessibility-tree locator ladder (Joseph, 2026) for relocation | Team decision: relocation stays LLM-based as proposed; the ladder is a possible FYP-II improvement |

## Consequences
- **Positive:**
  - Deterministic and fast; each decision is far below the 200 ms NFR.
  - Every decision has an exact, auditable trace of each evidence group's contribution.
  - Works before data exists, using expert priors.
  - Upgrades fit behind the same interfaces in FYP-II: tables learned from benchmark counts, calibration, ROC thresholds.
- **Negative/Risk:**
- The likelihood values may begin as expert judgements or agent proposals and remain provisional until calibrated. Mitigation: record a written justification and source for each value, use `src/core/sensitivity.py`, and evaluate calibration on held-out labelled data.
  - The independence-between-groups assumption may make the engine overconfident. Mitigation: grouping correlated signals, and checking calibration on the scenario suite.
- **Claim correction:** a ROC analysis on ~50 cases cannot *guarantee* FPR < 5%, because the sampling uncertainty is wide. FYP-II will either report FPR with a confidence interval or use conformal risk control, which gives a finite-sample bound.
- **Resolved by C2:** CI `flaky` maps to the `rerun` action; `rerun` is a recommendation only in FYP-1.
- **Deferred to Iteration 2:**
  - `DecisionStore` persistence via SQLite, as decided in ADR 005;
  - live CI integration and fix PRs, as scoped in ADR 006.
