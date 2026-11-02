# CI failure corpus

This directory contains public GitHub Actions failure logs collected by
`scripts/collect_ci_corpus.py`. Logs are truncated through `src/ci/truncate.py` and common token
patterns are masked before they are written. Workflow logs may still contain identifying project
content; review each saved case before distribution.

## Sources

- `1and1/snmpman`
- `ASSERT-KTH/depclean`
- `ASSERT-KTH/sorald`
- `NemProject/nem`
- `Samsung/LPVS`
- `actions/setup-python`
- `alphagov/pay-adminusers`
- `alphagov/pay-cardid`
- `arextest/arex-agent-java`
- `beetbox/beets`
- `camunda-community-hub/camunda-platform-7-mockito`
- `canonical/cloud-init`
- `cowrie/cowrie`
- `danielegrattarola/spektral`
- `dask/dask`
- `django-import-export/django-import-export`
- `django/django`
- `encode/httpx`
- `encode/starlette`
- `encode/uvicorn`
- `errbotio/errbot`
- `facebook/facebook-java-business-sdk`
- `fastapi/fastapi`
- `fmtn/a`
- `getgauge/gauge-java`
- `googleapis/google-cloud-java`
- `googleapis/google-cloud-python`
- `googleapis/java-pubsub-group-kafka-connector`
- `googleapis/java-storage-nio`
- `hacs/integration`
- `home-assistant/core`
- `huggingface/accelerate`
- `huggingface/diffusers`
- `hugsy/gef`
- `jcabi/jcabi-http`
- `jcabi/jcabi-maven-plugin`
- `jcabi/jcabi-simpledb`
- `jcabi/jcabi-ssh`
- `jenkinsci/amazon-ecr-plugin`
- `jenkinsci/code-coverage-api-plugin`
- `jenkinsci/file-operations-plugin`
- `jenkinsci/forensics-api-plugin`
- `jenkinsci/incrementals-tools`
- `kiegroup/optaplanner-wb`
- `leonardehrenfried/jspc-maven-plugin`
- `micycle1/PGS`
- `mindsdb/mindsdb`
- `mosaicml/composer`
- `mwaskom/seaborn`
- `nodejs/node`
- `numpy/numpy`
- `octodns/octodns`
- `online-ml/river`
- `openvinotoolkit/open_model_zoo`
- `optuna/optuna`
- `pallets/click`
- `pallets/flask`
- `pandas-dev/pandas`
- `pholser/junit-quickcheck`
- `pmckeown/dependency-track-maven-plugin`
- `premium-minds/billy`
- `premium-minds/wicket-crudifier`
- `psf/requests`
- `pwndbg/pwndbg`
- `pydantic/pydantic`
- `pylint-dev/pylint`
- `pypa/pip`
- `pytest-dev/pytest`
- `python/cpython`
- `quarkiverse/quarkus-micrometer-registry`
- `rust-lang/rust`
- `s4u/pgpverify-maven-plugin`
- `sanic-org/sanic`
- `scoverage/scoverage-maven-plugin`
- `skypilot-org/skypilot`
- `snowflakedb/snowflake-jdbc`
- `spotify/missinglink`
- `tornadoweb/tornado`
- `vandmo/dependency-lock-maven-plugin`
- `vercel/next.js`
- `volodya-lombrozo/jtcop`
- `wandb/wandb`
- `yt-dlp/yt-dlp`
- `zold-io/java-api`

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
| `flaky` | 3 |
| `dependency` | 66 |
| `bug` | 69 |
| `infra` | 68 |
| **Total verified** | **206** |

## Cases by source

| Source | Cases | Reviewed | flaky | dependency | bug | infra |
|---|---:|---:|---:|---:|---:|---:|
| `mined` | 73 | 72 | 3 | 0 | 1 | 68 |
| `lca` | 68 | 68 | 0 | 0 | 68 | 0 |
| `bump` | 68 | 66 | 0 | 66 | 0 | 0 |
| `injected` | 0 | 0 | 0 | 0 | 0 | 0 |

Counts are regenerated whenever the collector runs and include only cases with both a reviewed
label and its evidence source.
