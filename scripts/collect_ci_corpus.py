#!/usr/bin/env python3
"""Collect public GitHub Actions failures for the human-verified CI corpus."""

from __future__ import annotations

import argparse
import http.client
import io
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path
from typing import Any

import yaml

from src.ci.truncate import truncate_log

API_ROOT = "https://api.github.com"
CORPUS_DIR = Path("tests/ci_corpus")
LABELS = ("flaky", "dependency", "bug", "infra")
SECRET_PATTERNS = (
    re.compile(
        r"https?://[^\s\]\)\"']*(?:\?|&)(?:[^#\s\]\)\"']*&)?"
        r"(?:sig|token|signature)=[^&#\s\]\)\"']+(?:&[^#\s\]\)\"']*)?",
        re.IGNORECASE,
    ),
    re.compile(r"ghp_[A-Za-z0-9]+"),
    re.compile(r"gsk_[A-Za-z0-9]+"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"Bearer\s+\S+", re.IGNORECASE),
)
INFRA_PATTERN = re.compile(
    r"(runner (?:lost|shutdown|unavailable)|hosted runner|service unavailable|"
    r"connection reset|network is unreachable|temporary failure in name resolution|"
    r"timed out|rate limit exceeded)",
    re.IGNORECASE,
)


class GitHubError(RuntimeError):
    """An HTTP or response error from the GitHub REST API."""


def _http_error_message(error: urllib.error.HTTPError) -> str:
    try:
        response = json.loads(error.read())
    except (UnicodeDecodeError, json.JSONDecodeError):
        return f"GitHub returned HTTP {error.code}"
    message = response.get("message") if isinstance(response, dict) else None
    if not isinstance(message, str) or not message:
        return f"GitHub returned HTTP {error.code}"
    return f"GitHub returned HTTP {error.code}: {_mask_secrets(message)}"


class _SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Do not forward GitHub credentials to a redirected log-storage host."""

    def redirect_request(self, request, fp, code, message, headers, new_url):
        redirected = super().redirect_request(request, fp, code, message, headers, new_url)
        if redirected and urllib.parse.urlparse(request.full_url).netloc != urllib.parse.urlparse(new_url).netloc:
            redirected.remove_header("Authorization")
            redirected.remove_header("Proxy-Authorization")
        return redirected


_URL_OPENER = urllib.request.build_opener(_SafeRedirectHandler())


def _github_token() -> str | None:
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        return token
    env_file = Path(".env")
    if not env_file.is_file():
        return None
    for line in env_file.read_text(encoding="utf-8").splitlines():
        entry = line.strip()
        if entry.startswith("export "):
            entry = entry[7:].lstrip()
        key, separator, value = entry.partition("=")
        if separator and key.strip() == "GITHUB_TOKEN":
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            return value or None
    return None


def _request(url: str, *, binary: bool = False, authenticated: bool = True) -> bytes:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "TriageCore-CI-Corpus-Collector",
    }
    token = _github_token() if authenticated else None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    try:
        with _URL_OPENER.open(request, timeout=30) as response:
            content = response.read()
    except urllib.error.HTTPError as exc:
        if exc.code == 401 and "Authorization" in headers:
            raise GitHubError("GitHub rejected the configured GITHUB_TOKEN (HTTP 401)") from None
        raise GitHubError(
            f"{_http_error_message(exc)} for {url.split('?')[0]}"
        ) from None
    except TimeoutError:
        raise GitHubError("GitHub request timed out") from None
    except (http.client.IncompleteRead, ConnectionError):
        raise GitHubError("GitHub response was interrupted") from None
    except urllib.error.URLError as exc:
        raise GitHubError(f"Could not reach GitHub: {exc.reason}") from None
    if not binary:
        try:
            json.loads(content)
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise GitHubError("GitHub returned an invalid JSON response") from None
    return content


def _get_json(path: str, params: dict[str, Any] | None = None) -> Any:
    query = f"?{urllib.parse.urlencode(params)}" if params else ""
    return json.loads(_request(f"{API_ROOT}{path}{query}"))


def _mask_secrets(text: str) -> str:
    for pattern in SECRET_PATTERNS:
        text = pattern.sub("[REDACTED]", text)
    return text


def _normalise_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def _failed_job_logs(archive: bytes, jobs: list[dict[str, Any]]) -> str:
    failed_jobs = [
        job for job in jobs if job.get("conclusion") in {"failure", "timed_out", "cancelled"}
    ]
    if not failed_jobs:
        raise GitHubError("No failed job was available for the failed workflow attempt")

    with zipfile.ZipFile(io.BytesIO(archive)) as bundle:
        members = [item for item in bundle.infolist() if not item.is_dir()]
        selected: list[zipfile.ZipInfo] = []
        for job in failed_jobs:
            job_name = _normalise_name(str(job.get("name", "")))
            job_id = str(job.get("id", ""))
            for item in members:
                parts = item.filename.replace("\\", "/").split("/")
                folder = _normalise_name(parts[0]) if len(parts) > 1 else ""
                if (job_name and (folder == job_name or folder.startswith(job_name))) or job_id in parts:
                    if item not in selected:
                        selected.append(item)
        if not selected:
            raise GitHubError("Could not match failed jobs to entries in the run log archive")
        chunks = []
        for item in sorted(selected, key=lambda member: member.filename):
            contents = bundle.read(item).decode("utf-8", errors="replace")
            chunks.append(f"===== {item.filename} =====\n{contents}")
        return "\n".join(chunks)


def _attempts(owner: str, repo: str, run: dict[str, Any]) -> list[dict[str, Any]]:
    run_id = run["id"]
    count = int(run.get("run_attempt", 1))
    attempts = []
    for number in range(1, count + 1):
        details = _get_json(f"/repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{number}")
        attempts.append(
            {
                "attempt": number,
                "head_sha": details.get("head_sha", run.get("head_sha")),
                "conclusion": details.get("conclusion"),
            }
        )
    return attempts


def _failed_attempt_number(attempts: list[dict[str, Any]]) -> int:
    failed = [
        attempt["attempt"]
        for attempt in attempts
        if attempt.get("conclusion") in {"failure", "timed_out", "cancelled"}
    ]
    if not failed:
        raise GitHubError("No failed workflow attempt was found")
    return failed[-1]


def _run_log(owner: str, repo: str, run_id: int, attempt: int) -> str:
    jobs_response = _get_json(
        f"/repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt}/jobs",
        {"per_page": 100},
    )
    archive = _request(
        f"{API_ROOT}/repos/{owner}/{repo}/actions/runs/{run_id}/logs",
        binary=True,
    )
    return _failed_job_logs(archive, jobs_response.get("jobs", []))


def _commits(owner: str, repo: str, head_sha: str) -> list[dict[str, Any]]:
    response = _get_json(
        f"/repos/{owner}/{repo}/commits",
        {"sha": head_sha, "per_page": 10},
    )
    result = []
    for listed_commit in response[:10]:
        commit = _get_json(f"/repos/{owner}/{repo}/commits/{listed_commit['sha']}")
        author = commit.get("author") or {}
        commit_data = commit.get("commit") or {}
        result.append(
            {
                "sha": commit["sha"],
                "author": author.get("login") or (commit_data.get("author") or {}).get("name", "unknown"),
                "files": [item["filename"] for item in commit.get("files", [])],
            }
        )
    return result


def _is_dependency_path(path: str) -> bool:
    name = path.replace("\\", "/").rsplit("/", 1)[-1]
    return name in {
        "package.json",
        "package-lock.json",
        "pyproject.toml",
        "poetry.lock",
        "go.sum",
    } or (name.startswith("requirements") and name.endswith(".txt"))


def _next_successful_run(owner: str, repo: str, run: dict[str, Any]) -> dict[str, Any] | None:
    workflow_id = run.get("workflow_id")
    branch = run.get("head_branch")
    if not workflow_id or not branch:
        return None
    response = _get_json(
        f"/repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs",
        {"branch": branch, "status": "success", "per_page": 100},
    )
    later = [
        item
        for item in response.get("workflow_runs", [])
        if item.get("created_at", "") > run.get("created_at", "")
        and item.get("head_sha") != run.get("head_sha")
    ]
    return min(later, key=lambda item: item.get("created_at", "")) if later else None


def _next_fix_label(owner: str, repo: str, run: dict[str, Any]) -> str | None:
    success = _next_successful_run(owner, repo, run)
    if not success or not success.get("head_sha"):
        return None
    compare = _get_json(
        f"/repos/{owner}/{repo}/compare/{run['head_sha']}...{success['head_sha']}"
    )
    commits = compare.get("commits", [])
    if not commits:
        return None
    first_commit = _get_json(
        f"/repos/{owner}/{repo}/commits/{commits[0]['sha']}"
    )
    files = [item.get("filename", "") for item in first_commit.get("files", [])]
    if files and all(_is_dependency_path(path) for path in files):
        return "dependency"
    if any(not _is_dependency_path(path) for path in files):
        return "bug"
    return None


def _suggest_label(
    owner: str,
    repo: str,
    run: dict[str, Any],
    log: str,
    attempts: list[dict[str, Any]],
) -> str | None:
    failed_shas: set[str] = set()
    for attempt in attempts:
        sha = attempt.get("head_sha")
        if not sha:
            continue
        if attempt.get("conclusion") == "success" and sha in failed_shas:
            return "flaky"
        if attempt.get("conclusion") != "success":
            failed_shas.add(sha)
    if INFRA_PATTERN.search(log):
        return "infra"
    fix_label = _next_fix_label(owner, repo, run)
    if fix_label:
        return fix_label
    return None


def _case_dir_name(owner: str, repo: str, run_id: int) -> str:
    safe_repo = re.sub(r"[^A-Za-z0-9._-]", "-", f"{owner}-{repo}")
    return f"{safe_repo}-{run_id}"


def _collect_case(owner: str, repo: str, run: dict[str, Any], suggest: bool) -> Path:
    attempts = _attempts(owner, repo, run)
    failed_attempt = _failed_attempt_number(attempts)
    raw_log = _run_log(owner, repo, int(run["id"]), failed_attempt)
    masked_log = _mask_secrets(raw_log)
    truncated = truncate_log(masked_log)
    case = {
        "repo": f"{owner}/{repo}",
        "run_id": int(run["id"]),
        "head_sha": run["head_sha"],
        "run_attempts": attempts,
        "commits": _commits(owner, repo, run["head_sha"]),
        "label": None,
        "label_source": None,
        "risk_tier": "medium",
    }
    if suggest:
        suggested = _suggest_label(owner, repo, run, masked_log, attempts)
        if suggested:
            case["suggested_label"] = suggested
    case_dir = CORPUS_DIR / _case_dir_name(owner, repo, int(run["id"]))
    case_dir.mkdir(parents=True, exist_ok=True)
    (case_dir / "log.txt").write_text(truncated.text, encoding="utf-8")
    (case_dir / "case.yaml").write_text(
        yaml.safe_dump(case, sort_keys=False, allow_unicode=True), encoding="utf-8"
    )
    return case_dir


def _verified_case(case_file: Path) -> dict[str, Any] | None:
    try:
        case = yaml.safe_load(case_file.read_text(encoding="utf-8")) or {}
    except (OSError, yaml.YAMLError):
        return None
    if case.get("label") not in LABELS:
        return None
    if not case.get("label_source"):
        return None
    return case


def _write_readme() -> None:
    case_files = sorted(CORPUS_DIR.glob("*/case.yaml"))
    verified = [case for path in case_files if (case := _verified_case(path)) is not None]
    counts = {label: sum(case.get("label") == label for case in verified) for label in LABELS}
    repos = set()
    for path in case_files:
        try:
            case = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        except (OSError, yaml.YAMLError):
            continue
        if case.get("repo"):
            repos.add(str(case["repo"]))
    repos = sorted(repos)
    source_list = "\n".join(f"- `{repo}`" for repo in repos) or "- No labeled cases yet."
    label_counts = "\n".join(f"| `{label}` | {counts[label]} |" for label in LABELS)
    readme = f"""# CI failure corpus

This directory contains public GitHub Actions failure logs collected by
`scripts/collect_ci_corpus.py`. Logs are truncated through `src/ci/truncate.py` and common token
patterns are masked before they are written. Workflow logs may still contain identifying project
content; review each saved case before distribution.

## Sources

{source_list}

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
{label_counts}
| **Total verified** | **{len(verified)}** |

Counts are regenerated whenever the collector runs and include only cases with both a reviewed
label and its evidence source.
"""
    CORPUS_DIR.mkdir(parents=True, exist_ok=True)
    (CORPUS_DIR / "README.md").write_text(readme, encoding="utf-8")


def collect(owner_repo: str, max_runs: int, suggest: bool) -> int:
    if "/" not in owner_repo:
        raise ValueError("repository must be in owner/repo form")
    owner, repo = owner_repo.split("/", 1)
    if not owner or not repo or "/" in repo:
        raise ValueError("repository must be in owner/repo form")
    if max_runs < 1:
        raise ValueError("--max-runs must be positive")

    page = 1
    processed = 0
    saved = 0
    while processed < max_runs:
        page_size = min(100, max_runs - processed)
        response = _get_json(
            f"/repos/{owner}/{repo}/actions/runs",
            {"status": "failure", "per_page": page_size, "page": page},
        )
        runs = response.get("workflow_runs", [])
        if not runs:
            break
        for run in runs:
            if processed >= max_runs:
                break
            processed += 1
            case_dir = CORPUS_DIR / _case_dir_name(owner, repo, int(run["id"]))
            if (case_dir / "case.yaml").exists():
                print(f"Already collected run {run['id']}; skipping")
                continue
            try:
                case_dir = _collect_case(owner, repo, run, suggest)
            except (GitHubError, KeyError, ValueError, zipfile.BadZipFile) as exc:
                print(f"Skipping run {run.get('id', 'unknown')}: {exc}", file=sys.stderr)
                continue
            saved += 1
            print(f"Saved {case_dir}")
        page += 1
    _write_readme()
    print(f"Collected {saved} case(s); {processed} failed run(s) examined.")
    return saved


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("owner_repo", help="public GitHub repository in owner/repo form")
    parser.add_argument("--max-runs", type=int, default=30, help="maximum failed runs to examine")
    parser.add_argument(
        "--suggest-labels",
        action="store_true",
        help="write a non-binding suggested_label when the log supports a heuristic",
    )
    args = parser.parse_args()
    try:
        collect(args.owner_repo, args.max_runs, args.suggest_labels)
    except (GitHubError, ValueError) as exc:
        parser.error(str(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
