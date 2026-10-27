# Evidence Contract: `CILogFacts`, `raw_signals` and `context` for the CI Agent

**Status:** v1, approved by Shazil (2026-10-26). No probabilities or costs are specified.
**Applies to:** `ConfidenceEngineInput` with `source="ci"`.
**Related contracts:** `docs/contracts/engine_io.md`; QA equivalent: `docs/contracts/raw_signals.md`.

## Why this contract exists

CI logs and run metadata need a stable boundary between LLM-extracted facts, engine evidence,
traceability context, and the human-provided case label. The LLM proposes structured facts only; the
engine's policy selects `recommended_action`.

## Evidence window and label

Evidence consists only of facts available before the rerun. The rerun result is the evaluation label
(`flaky` when the same commit fails and then passes; otherwise the case's human-verified cause); it is
not an input signal or evidence group. This follows the team decision recorded in `TODO.md` on
2026-10-25.

## `CILogFacts` (LLM-extracted facts)

| Field | Type | Meaning and validation |
|---|---|---|
| `failure_kind` | enum or null | One of `test_assertion`, `compile_or_syntax`, `import_or_missing_module`, `dependency_resolution`, `network_or_timeout`, `runner_or_resources`, `other`; null when not supported by the log. |
| `failing_files` | list of strings | Repository-relative paths, at most 20; empty when none can be identified. |
| `error_excerpt` | string or null | At most 300 characters, retained for the reasoning trace only and never weighted. |

Invalid or unsupported extracted values are missing evidence; LLM free text must not reach the engine's
decision. File paths must be checked against repository data before commit tracing.

## `raw_signals` (CI)

These are facts available before rerun. Null means not observed and is omitted from the calculation,
not treated as a negative state.

| Key | Type | Meaning |
|---|---|---|
| `failure_kind` | enum or null | Validated `CILogFacts.failure_kind`. |
| `dependency_change` | `changed`, `unchanged` or null | Whether any of the at most 10 recent commits touched a dependency manifest or lockfile (`package.json`, `package-lock.json`, `requirements*.txt`, `pyproject.toml`, `poetry.lock`, `go.sum`); null when no relevant history is available. |
| `code_link` | `failing_file_touched`, `not_touched` or null | Whether a recent commit touched an identified failing file; null when no failing files or usable commit history exists. |
| `truncated` | bool | Whether the log was truncated before fact extraction; used by the `log_coverage` evidence group. |

`error_excerpt`, `failing_files`, commit identifiers, and repository metadata are not themselves
weighted. The first two support tracing and explanation; commit attribution supports the safety
precondition below.

## `context` (CI)

Context is for traceability and decision constraints, not evidence likelihoods.

| Key | Type | Meaning |
|---|---|---|
| `risk_tier` | str | Required; selects the CI loss table. The CI tier values must match the configured CI weights. |
| `repo` | str | Repository identifier. |
| `run_id` | str | Workflow run identifier. |
| `case_id` | str or null | Corpus case identifier, when evaluating a saved case. |
| `ambiguous_commit` | bool | True when two or more recent commits touch a failing file. |
| `attributed_commit` | str or null | Commit SHA only when exactly one recent commit touches a failing file. |

No rerun outcome belongs in `context` or `raw_signals`; it is a label only.

## Evidence groups

| Group | From | States |
|---|---|---|
| `failure_kind` | `raw_signals.failure_kind` | `test_assertion`, `compile_or_syntax`, `import_or_missing_module`, `dependency_resolution`, `network_or_timeout`, `runner_or_resources`, `other` |
| `dependency_change` | `raw_signals.dependency_change` | `changed`, `unchanged` |
| `code_link` | `raw_signals.code_link` | `failing_file_touched`, `not_touched` |
| `log_coverage` | `raw_signals.truncated` | `truncated`, `complete` |

These approved groups describe pre-rerun evidence only. No probabilities are defined here; those are
Shazil's C9 responsibility.

## Hard preconditions

`auto-fix` is blocked unless `attributed_commit` is set and `ambiguous_commit` is false. A commit is
attributed only when exactly one recent commit touches an identified failing file; two or more means
ambiguous and none may be selected. The engine must never guess.

The engine must pass both `raw_signals` and `context` to `blocked_actions(raw_signals, context)` so
the precondition can inspect `ambiguous_commit` and `attributed_commit`. The QA adapter ignores the
context argument. Context-only safety fields must never bypass the `auto-fix` block.

## Approved decisions

- The evidence groups are `failure_kind`, `dependency_change`, `code_link`, and `log_coverage`.
- Truncation is a separate `log_coverage` group; it does not erase an otherwise supported
  `failure_kind`.
- `truncated` appears only in `raw_signals`, where it feeds `log_coverage`; it is not duplicated in
  `context`.
- The engine passes `context` explicitly to `blocked_actions(raw_signals, context)`.

## Resolved decisions

- Evidence is pre-rerun facts only; the rerun outcome is the label (team decision, 2026-10-25).
- `auto-fix` requires exactly one attributed commit and no ambiguity (FR-C5).
- The group, truncation, and `blocked_actions` interface decisions above were approved by Shazil on
  2026-10-26.
