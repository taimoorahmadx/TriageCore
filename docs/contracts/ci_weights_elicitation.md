# CI Weights Elicitation · Initial proposal (C9)

**Author:** AI-proposed for Shazil · **Date:** 2026-10-27  
**Status:** Prior and likelihood values are provisional, uncalibrated proposals. The single `default`
loss table is approved by Shazil (2026-10-27). No values below are results measured on TriageCore's
CI corpus. C12 must refit probabilities using human-reviewed labels and evaluate on a separate,
held-out set.

**Applies to:** the `ci` domain in `src/core/weights.yaml`. Cause and evidence names follow the
approved [`ci_signals.md`](ci_signals.md) contract. Values are probabilities of observing a state
given a cause; each row sums to 1. The numeric likelihoods are elicited assumptions informed by the
sources below, not frequencies copied from those studies.

## Sources and limits

- Zheng et al., [“Why Do GitHub Actions Workflows Fail? An Empirical Study”](https://doi.org/10.1145/3749371), manually classifies 375 failed workflow runs from 260 open-source Java repositories. It distinguishes project-side test/compile/dependency failures from workflow/environment failures, including network and resource causes. Its taxonomy guides the `failure_kind` distinctions, but its sample is not this project’s dataset and does not directly provide these conditional likelihoods.
- Gruber et al., [“An Empirical Study of Flaky Tests in Python”](https://doi.org/10.1109/ICST49551.2021.00026), analyzes flaky tests in Python and reports order dependence, test infrastructure, network, and randomness as causes. This supports allowing flaky test failures to overlap with network and runner/resource observations; its cause fractions are not transferred as CI priors.
- Ziftci and Cavalcanti, [“De-Flake Your Tests: Automatically Locating Root Causes of Flaky Tests in Code at Google”](https://research.google/pubs/de-flake-your-tests-automatically-locating-root-causes-of-flaky-tests-in-code-at-google/), studies root-cause localization across 428 Google projects. It supports treating flakiness as a distinct diagnosis, while not supplying the probabilities used here.
- The `dependency_change`, `code_link`, and `log_coverage` state meanings come from the approved C1 contract. Their numeric values below are explicit analyst assumptions; they are not estimates from those papers.

The project does not yet have a representative set of human-reviewed CI labels. Therefore the flat prior is intentionally noncommittal. Every other probability is a provisional modeling judgment, to be replaced or retained only after C12 calibration.

## 1. Prior probabilities

| Cause | Prior | Provenance and rationale |
|---|---:|---|
| `flaky` | 0.25 | Agent-proposed neutral share: no reviewed project sample establishes its prevalence. Research documents flakiness in CI, but the published samples differ from this project’s intended cases. |
| `dependency` | 0.25 | Same neutral prior; no representative project labels establish a larger or smaller share. |
| `bug` | 0.25 | Same neutral prior; avoids treating published project-specific failure frequencies as this project’s prevalence. |
| `infra` | 0.25 | Same neutral prior; workflow/environment causes are documented in GHA studies, but no project-specific prevalence estimate exists. |

## 2. Likelihoods

For each row, values are ordered as the named evidence states. The rationale and provenance apply to
every value in that row, including its complementary states.

### `failure_kind`

| Cause | `test_assertion` | `compile_or_syntax` | `import_or_missing_module` | `dependency_resolution` | `network_or_timeout` | `runner_or_resources` | `other` | Provenance and rationale |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `flaky` | 0.05 | 0.02 | 0.02 | 0.03 | 0.45 | 0.35 | 0.08 | Agent proposal informed by the flaky-test studies: non-determinism may surface as network/time behavior or runner/test infrastructure instability. These are not published conditional rates. |
| `dependency` | 0.02 | 0.03 | 0.35 | 0.45 | 0.02 | 0.03 | 0.10 | Agent proposal informed by the GHA failure taxonomy: unresolved or incompatible dependencies often appear as missing imports or dependency-resolution errors. Exact rates are assumptions. |
| `bug` | 0.55 | 0.20 | 0.02 | 0.02 | 0.02 | 0.02 | 0.17 | Agent proposal informed by the GHA study’s project-side test and compile categories. Assertion and compilation failures are favored; the remaining mass allows incomplete or atypical logs. |
| `infra` | 0.03 | 0.02 | 0.02 | 0.03 | 0.20 | 0.50 | 0.20 | Agent proposal informed by the GHA study’s environment/workflow causes. Runner/resource and network failures are favored; the other states allow noisy attribution. |

### `dependency_change`

| Cause | `changed` | `unchanged` | Provenance and rationale |
|---|---:|---:|---|
| `flaky` | 0.10 | 0.90 | Agent assumption: intermittent test/environment behavior is usually independent of a recent dependency-manifest edit; C1’s history window limits what can be observed. |
| `dependency` | 0.80 | 0.20 | Agent assumption: dependency failures are strongly associated with a changed manifest or lockfile, while allowing transitive, registry, and older-resolution failures. The GHA study documents dependency failures but does not estimate this conditional rate. |
| `bug` | 0.35 | 0.65 | Agent assumption: a code regression can accompany dependency changes, but most bug-causing changes need not touch a dependency file. |
| `infra` | 0.20 | 0.80 | Agent assumption: runner/network causes are usually independent of repository dependency-file changes; the nonzero value allows coincident changes. |

### `code_link`

| Cause | `failing_file_touched` | `not_touched` | Provenance and rationale |
|---|---:|---:|---|
| `flaky` | 0.15 | 0.85 | Agent assumption: flaky behavior often persists without a relevant source edit; changes to the test or failing file can still alter timing/order. Flaky-test studies document both test-code and infrastructure causes. |
| `dependency` | 0.45 | 0.55 | Agent assumption: a dependency failure may be linked to a manifest/lockfile rather than the failing source file, so a touched failing file is only moderately likely. |
| `bug` | 0.80 | 0.20 | Agent assumption: a newly introduced product defect is likely, though not certain, to coincide with a commit touching the failing file. C7 attribution is a separate traceability signal and does not prove causation. |
| `infra` | 0.10 | 0.90 | Agent assumption: external runner or service problems are usually unrelated to a failing source file; occasional overlap is allowed. |

### `log_coverage`

| Cause | `truncated` | `complete` | Provenance and rationale |
|---|---:|---:|---|
| `flaky` | 0.10 | 0.90 | Agent-chosen neutral likelihood, shared across causes. Truncation describes observation quality, not a cause, so it must not favor one diagnosis. |
| `dependency` | 0.10 | 0.90 | Same neutral assumption; the values cancel between causes in Bayes updates. |
| `bug` | 0.10 | 0.90 | Same neutral assumption; the values cancel between causes in Bayes updates. |
| `infra` | 0.10 | 0.90 | Same neutral assumption; the values cancel between causes in Bayes updates. |

## 3. Policy loss costs · approved

Shazil approved one CI risk tier, `default`, and this matrix on 2026-10-27. Values are relative
policy loss points, not measured engineer-minutes and not parameters to fit in C12.

| Action | if `flaky` | if `dependency` | if `bug` | if `infra` | Tradeoff |
|---|---:|---:|---:|---:|---|
| `rerun` | 0 | 10 | 10 | 10 | Rerun is the intended action for flaky failures; a mistaken rerun delays diagnosis of other causes. |
| `auto-fix` | 10 | 0 | 0 | 10 | The action is appropriate for dependency/code causes only with C8’s unique-commit precondition; a mistaken proposal risks wasting review time or steering toward a bad change. |
| `escalate` | 2 | 2 | 2 | 0 | Escalation is a low fixed handling cost for the first three diagnoses; infra escalation is the preferred outcome and costs zero in this relative scale. |

Costs encode policy: autonomous action errors are five times an ordinary escalation on this scale.
The hard precondition remains independently enforced: `auto-fix` is blocked unless exactly one
commit is attributed and `ambiguous_commit` is false. No changes are applied or merged automatically.

## 4. Unknown-pattern floor

The initial CI value is `0.05`, retained as a conservative provisional engine threshold. It is not
empirically calibrated. It should be reviewed alongside the probability tables during C12; it is not
part of the owner-approved action loss matrix.
