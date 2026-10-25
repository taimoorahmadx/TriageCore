# Decision record contract

SQLite persistence is implemented by `src/db/store.py`. The default database path is
`data/triagecore.sqlite3` under the repository root; `TRIAGECORE_DB_PATH` overrides it.

## `decisions`

| Column | Type | Meaning |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY` | Database record id. |
| `created_at` | `TEXT` | ISO-8601 UTC timestamp. |
| `source` | `TEXT` | `qa` or `ci`. |
| `run_id` | `TEXT` | UUID for one scenario or case run. |
| `case_id` | `TEXT` | Scenario id or corpus case id. |
| `step_id` | `TEXT` | Step id; null for CI. |
| `status` | `TEXT` | `triage` or `error`. |
| `classification` | `TEXT` | Diagnosis; null when no engine result exists. |
| `recommended_action` | `TEXT` | Policy action; null when no engine result exists. |
| `confidence_score` | `INTEGER` | Engine confidence; null when no engine result exists. |
| `evidence_json` | `TEXT` | JSON evidence supplied to the engine. |
| `output_json` | `TEXT` | JSON engine output; null when no engine result exists. |
| `details_json` | `TEXT` | JSON detailed trace data; null when unavailable. |
| `error` | `TEXT` | Error detail; null when the step completed triage. |

`GET /api/qa/decisions?limit=50` returns newest first and only includes QA records. `limit` must
be between 1 and 500 inclusive. JSON columns are decoded in the response.

## `ci_jobs`

| Column | Type | Meaning |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY` | Database record id. |
| `received_at` | `TEXT` | ISO-8601 UTC receipt timestamp. |
| `delivery_id` | `TEXT UNIQUE` | Webhook delivery idempotency key. |
| `repo` | `TEXT` | Repository name. |
| `run_id` | `INTEGER` | GitHub Actions run id. |
| `head_sha` | `TEXT` | Commit at the head of the run. |
| `payload_json` | `TEXT` | Original webhook payload as JSON. |
| `state` | `TEXT` | Job state, defaulting to `pending`. |

Saving a job with an existing `delivery_id` returns the existing row id.
