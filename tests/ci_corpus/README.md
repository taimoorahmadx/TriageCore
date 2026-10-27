# CI failure corpus

This directory contains public GitHub Actions failure logs collected by
`scripts/collect_ci_corpus.py`. Logs are truncated through `src/ci/truncate.py` and common token
patterns are masked before they are written. Workflow logs may still contain identifying project
content; review each saved case before distribution.

## Sources

- `actions/setup-python`
- `django/django`
- `encode/httpx`
- `fastapi/fastapi`
- `home-assistant/core`
- `nodejs/node`
- `numpy/numpy`
- `pallets/click`
- `pallets/flask`
- `psf/requests`
- `pydantic/pydantic`
- `pytest-dev/pytest`
- `rust-lang/rust`
- `vercel/next.js`

Logs are public GitHub artifacts fetched from their respective public repositories. Repository
licences vary; consult each source repository's licence and follow its terms when reusing code or
log content. This corpus stores failure logs and run metadata for research and evaluation, not source
code.

## Labels

Heuristic output, when present, is written to `suggested_label` only. It is not ground truth. A human
reviewer must set `label` and provide a one-line `label_source`. Cases missing either field are
excluded from evaluation.

| Reviewed label | Count |
|---|---:|
| `flaky` | 0 |
| `dependency` | 0 |
| `bug` | 0 |
| `infra` | 41 |
| **Total verified** | **41** |

Counts are regenerated whenever the collector runs and include only cases with both a reviewed
label and its evidence source.
