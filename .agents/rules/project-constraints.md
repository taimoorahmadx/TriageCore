# TriageCore Standing Constraints

- Never invent the mathematical weighting logic in `weights.yaml`. Generate placeholder fields with comments describing what each weight represents; a human fills in real values. If `weights.yaml` is missing or incomplete at runtime, raise an error — never default silently.
- The `classification` field output by `ConfidenceEngine` must always be diagnosis-only, never an action. The `recommended_action` field is the only place a threshold-derived decision (heal/escalate/auto-fix/flag) belongs. If you find yourself putting heal/escalate/auto-fix/flag into `classification`, stop and flag it instead of proceeding.
- Never allow the CI Reliability Agent to merge a pull request. It may only open one. The PR description must always include the `confidence_score` and `reasoning_trace` behind the proposed fix.
- Never silently resolve ambiguity. If a CI failure could be traced to more than one plausible commit, set `ambiguous_commit=true` in the evidence context and let the `ConfidenceEngine`'s score reflect that lower confidence, rather than guessing which commit is responsible.
- Any webhook endpoint handling GitHub payloads must verify the `X-Hub-Signature-256` header before processing. Reject unverified payloads with 401, malformed payloads with 400, and never crash the server on bad input.
- If a milestone's Technical Spec in `MILESTONES.md` conflicts with anything in `AGENTS.md`, stop and surface the conflict to the human instead of silently picking one.
