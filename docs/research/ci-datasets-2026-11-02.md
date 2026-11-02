# CI dataset survey for C3 (2026-11-02)

Purpose: find public CI-failure data to unblock C3 (≥5 reviewed cases per cause). Sources were
gathered in NotebookLM and reviewed by an AI agent. **Everything marked "verify" is unconfirmed**:
NotebookLM partly quoted an AI-written "survey" source, and two NotebookLM answers gave different
per-category counts for the same paper. Confirm each item against the actual download before use.

## Decision summary

- **Keep the four causes** (`flaky`, `dependency`, `bug`, `infra`). Do not adopt a dataset's
  taxonomy (e.g. "project-related / workflow-related"); those labels do not map to actions.
- **Label from the aftermath, evidence from before.** A label may use information the engine never
  sees (the fix diff, the rerun outcome). The engine may only see the failing log and commits up to
  `head_sha`. A human confirms every label (`label_source`); heuristics only write `suggested_label`.
- **Current corpus gap** (progress.md): infra is covered (41 labelled); `bug` (1), `dependency` (0)
  and `flaky` (3) are short.

## Sources to use

| Source | Gives | Use for | Verify first |
|---|---|---|---|
| **JetBrains `lca-ci-builds-repair`** — huggingface.co/datasets/JetBrains-Research/lca-ci-builds-repair | 212 real GitHub Actions failures (Python), raw logs in the `logs` field, `sha_fail`, `sha_success`, `diff`, `changed_files`; ~5 MB; permissive repo licences | `bug`, some `dependency` | Fields present; count of lockfile-only fixes vs src/test fixes. The dataset has **no cause labels** (only `difficulty`); any per-category counts quoted for it come from a synthetic proxy (`CI-Repair-Sim212`) and are not real. |
| **BUMP** (SANER 2024) — github.com/chains-project/bump, zenodo 10041883 | 571 breaking dependency updates (Java/Maven), per-case JSON in `data/benchmark/` (`breakingCommit`, `updatedDependency`, `failureCategory`); MIT | `dependency` | Whether GitHub Actions logs exist in the repo (`workflowLogs/` / `reproductionLogs/`). If logs only exist in the 150 GB Docker tarball, skip BUMP and use lca for dependency. |
| **Live mining (C3 script)** — runs from the last ~90 days, before GitHub log expiry | Real logs and run attempts | `flaky` (attempt 1 failed, later attempt passed on the same SHA, mechanism is test/code non-determinism), more `infra` | — |
| **Fault injection on a sandbox repo** (optional top-up) | Real runs, labels known by construction, written before the run | `flaky`, `dependency` if still < 5 | Report injected cases separately from real ones. |
| **Zheng/Lin et al., "Why Do GitHub Actions Workflows Fail?"** (TOSEM) — github.com/zhengly1/workflow_failure | 375 human-labelled GHA failures, 16 categories, κ = 0.708; per-case labelling file with job URLs | **Priors only** (and category recipes for injection) | Table 3 counts (two NotebookLM answers disagreed); whether log files are actually in the repo (README mentions only extraction scripts; 2023 logs have likely expired). |
| **Huang & Lin, "On the Reruns of GitHub Actions Workflows"** (TOSEM 2026) | Human-inspected rerun samples | Priors for the `flaky` share | Its logs are expired URLs. |
| **Ge & Zhang, flaky builds in GHA** — flaky-build.github.io, arXiv 2602.02307 | Large set of rerun-verified flaky builds with log snippets; full logs on request by email | Optional `flaky` cases | Licence; whether the authors will share logs. |

## Category mapping rules (for human labelling)

- Label by **cause, not symptom**: a BUMP `TEST_FAILURE` caused by a dependency bump is `dependency`.
- Zheng/Lin: P1, P5, P8-deterministic → `bug`; P3, P4, W4, W6 → `dependency`; P6 (vulnerability scan) →
  `dependency` or EXCLUDE; W1, W3, W7 → `infra`; P2, P7, W2 (workflow YAML), W5, W8 (merge/branch) → EXCLUDE.
- lca fix diff: lockfile/manifest only → `dependency`; src or tests touched → `bug`; workflow YAML only → EXCLUDE.

## Leakage rule (critical)

For lca and BUMP, `diff`, `changed_files`, `sha_success`, `failureCategory` and fix commits are
**label inputs only**. They must never reach `RawSignals` or the fact extractor. Engine evidence
(`dependency_change`, `code_link`) must come from commits up to and including `sha_fail`, fetched
from the GitHub API.

## Findings that affect design (owner decision needed, not applied)

- **flaky vs infra overlap.** Several studies (TELUS/Aïdasso et al. 2025: 58% of sampled
  same-commit reruns; Huang & Lin; Ge & Zhang: ~16% of flaky builds were network issues) find that
  many "passed on rerun" failures are transient infra. Proposal: define `flaky` by mechanism
  (test/code non-determinism) and treat rerun-pass as evidence, not the definition.
- **Rerun for transient infra.** Today only `flaky` makes `rerun` correct. The same studies support
  making `rerun` correct for `infra` too. This is a policy/loss change: project-owner approval,
  a `docs/log/changes.md` row and an ADR 006 addendum are required before editing `weights.yaml`.
- **Priors.** Zheng/Lin gives a real bug/dependency/infra mix but has no separate flaky category, so a
  flaky share must be combined from rerun studies. Any new prior is provisional, documented with
  its source, and owner-approved (AGENTS rule 1). Do not fit on the held-out split.
- **Workflow YAML misconfiguration / merge conflicts** (~7% in Zheng/Lin) fit no cause. Keep them
  excluded and list them as a limitation; no fifth cause in FYP-1.

## Rejected

TELUS industrial dataset (GitLab, anonymised, CC BY-NC-ND), OpenStack-RCA-Bench (cloud incidents,
not CI), GHALogs and GADFPD (no cause labels), FixFlow (LLM-assigned labels), GitBug-Java (bug only;
lca already covers bug), LogChunks and other Travis-only sets (wrong platform), workflow-history
datasets (no failures).

## Verified by a human (2026-11-02)

- **BUMP:** the GitHub repo has `workflowLogs/` at its root, so BUMP is usable for `dependency`
  without the 150 GB Docker tarball. The agent still checks that the logs are GitHub Actions logs.
- **Zheng/Lin Table 3 (from the paper, 375 cases):** P1 54, P2 19, P3 33, P4 45, P5 26, P6 15, P7 3,
  P8 120, W1 2, W2 21, W3 10, W4 13, W5 2, W6 3, W7 3, W8 6. The first NotebookLM answer was right
  and the second was wrong.
- **Mapped with the rules above** (P6 excluded): bug = P1+P5+P8 = 200, dependency = P3+P4+W4+W6 = 94,
  infra = W1+W3+W7 = 15, excluded = P2+P6+P7+W2+W5+W8 = 66. Shares of the 309 mapped cases:
  bug 64.7%, dependency 30.4%, infra 4.9%. P8 (tests) also contains flaky failures that the paper
  does not separate, so the `flaky` prior must come from the rerun studies. These are **candidate
  priors only**: provisional, and C12 must document and approve them before any `weights.yaml` change.
- **lca:** not yet checked. The Hugging Face rows API returned a 22-byte error from this machine.
- **Owner decision:** `rerun` should also be correct for transient `infra`. It is approved but not yet
  applied; it goes into `weights.yaml` with C12, together with an ADR 006 addendum.
- **lca checked by a human (2026-11-02):** the `default` config has one `test` split with 68 cases
  (the `old` config was not checked and may be the 212-case version). Fields include `logs`,
  `repo_owner`, `repo_name`, `sha_fail`, `sha_success`, `diff`, `changed_files`, `difficulty`. All
  68 fixes touch code files and none is lockfile-only. **So lca supplies `bug` only**, and
  `dependency` comes from BUMP. Many lca fixes are lint or formatting fixes (low `difficulty`). They
  still map to `bug` (Zheng/Lin P5), but the human reviewer should confirm each one.
