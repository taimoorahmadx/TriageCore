#!/usr/bin/env python3
"""Import lca and BUMP logs into the CI corpus without assigning human labels."""

from __future__ import annotations

import argparse
import io
import json
import re
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path
from typing import Any

import yaml

from scripts.collect_ci_corpus import (
    CORPUS_DIR,
    GitHubError,
    _commits,
    _mask_secrets,
)
from src.ci.truncate import truncate_log

HF_ROWS_URL = "https://datasets-server.huggingface.co/rows"
GITHUB_ACTION_MARKERS = (
    "##[group]",
    "##[command]",
    "##[error]",
    "##[debug]",
    "Current runner version:",
    "Runner Image",
    "GITHUB_ACTIONS",
)
DEPENDENCY_FILES = {
    "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "requirements.txt", "pyproject.toml", "poetry.lock", "pipfile", "pipfile.lock",
    "go.mod", "go.sum", "cargo.toml", "cargo.lock", "pom.xml", "build.gradle",
    "build.gradle.kts", "gradle.lockfile",
}


def _lca_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        query = urllib.parse.urlencode({
            "dataset": "JetBrains-Research/lca-ci-builds-repair",
            "config": "default", "split": "test", "offset": offset, "length": 100,
        })
        request = urllib.request.Request(HF_ROWS_URL + "?" + query)
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.loads(response.read())
        batch = [item["row"] for item in payload.get("rows", [])]
        rows.extend(batch)
        if not batch or offset + len(batch) >= payload.get("num_rows_total", len(rows)):
            return rows
        offset += len(batch)


def _lca_log(row: dict[str, Any]) -> str:
    logs = row.get("logs") or []
    if isinstance(logs, str):
        return logs
    if isinstance(logs, list):
        return "\n\n".join(
            f"===== {item.get('step_name', 'step')} =====\n{item.get('log', '')}"
            for item in logs if isinstance(item, dict) and isinstance(item.get("log"), str)
        )
    return ""


def _diff_paths(row: dict[str, Any]) -> list[str]:
    paths = row.get("changed_files") or []
    if isinstance(paths, str):
        paths = [paths]
    if paths:
        return [str(path) for path in paths]
    diff = row.get("diff") or ""
    return re.findall(r"^diff --git a/(.*?) b/", str(diff), re.MULTILINE)


def _suggest_lca(paths: list[str]) -> str | None:
    if not paths:
        return None
    basenames = [path.replace("\\", "/").rsplit("/", 1)[-1].lower() for path in paths]
    if all(name in DEPENDENCY_FILES or name.startswith("requirements") and name.endswith(".txt")
           for name in basenames):
        return "dependency"
    if all(path.startswith((".github/workflows/", ".circleci/", ".buildkite/"))
           for path in paths):
        return None
    return "bug"


def _write_case(case_id: str, repo: str, run_id: str, head_sha: str, log: str,
                source: str, suggested_label: str | None) -> Path | None:
    safe_id = re.sub(r"[^A-Za-z0-9._-]", "-", case_id)
    case_dir = CORPUS_DIR / safe_id
    if (case_dir / "case.yaml").exists():
        return None
    case = {
        "repo": repo,
        "run_id": str(run_id),
        "head_sha": head_sha,
        "run_attempts": [],
        "commits": _commits(*repo.split("/", 1), head_sha),
        "label": None,
        "label_source": None,
        "risk_tier": "medium",
        "source": source,
    }
    if suggested_label:
        case["suggested_label"] = suggested_label
    safe_log = _mask_secrets(log)
    case_dir.mkdir(parents=True, exist_ok=True)
    (case_dir / "log.txt").write_text(truncate_log(safe_log).text, encoding="utf-8")
    (case_dir / "case.yaml").write_text(
        yaml.safe_dump(case, sort_keys=False, allow_unicode=True), encoding="utf-8"
    )
    return case_dir


def import_lca() -> int:
    saved = 0
    for row in _lca_rows():
        owner, repo_name, sha = row.get("repo_owner"), row.get("repo_name"), row.get("sha_fail")
        log = _lca_log(row)
        if not owner or not repo_name or not sha or not log:
            continue
        suggested = _suggest_lca(_diff_paths(row))
        if suggested is None:  # Includes workflow-only fixes, which are outside the four causes.
            continue
        case_id = f"lca-{owner}-{repo_name}-{row.get('id', sha[:12])}"
        result = _write_case(case_id, f"{owner}/{repo_name}", str(row.get("id", sha)), sha,
                             log, "lca", suggested)
        saved += result is not None
    return saved


def _read_bump_log(root: Path, breaking_commit: str) -> str | None:
    log_root = root / "workflowLogs"
    for path in sorted(log_root.rglob("*")):
        if not path.is_file() or breaking_commit.lower() not in str(path).lower():
            continue
        try:
            data = path.read_bytes()
            if zipfile.is_zipfile(io.BytesIO(data)):
                with zipfile.ZipFile(io.BytesIO(data)) as archive:
                    parts = [archive.read(name).decode("utf-8", errors="replace")
                             for name in archive.namelist() if not name.endswith("/")]
                text = "\n".join(parts)
            else:
                text = data.decode("utf-8", errors="replace")
        except (OSError, zipfile.BadZipFile):
            continue
        if any(marker in text for marker in GITHUB_ACTION_MARKERS):
            return text
    return None


def import_bump(root: Path) -> tuple[int, int]:
    benchmark = root / "data" / "benchmark"
    if not benchmark.is_dir() or not (root / "workflowLogs").is_dir():
        raise ValueError("BUMP root must contain data/benchmark/ and workflowLogs/")
    saved = 0
    skipped_evidence = 0
    for path in sorted(benchmark.glob("*.json")):
        record = json.loads(path.read_text(encoding="utf-8"))
        sha = record.get("breakingCommit")
        log = _read_bump_log(root, str(sha or ""))
        if not sha or not log:
            continue
        owner = record.get("projectOrganisation")
        repo_name = record.get("project")
        slug = (record.get("updatedDependency") or {}).get("githubRepoSlug")
        if (not owner or not repo_name) and isinstance(slug, str) and "/" in slug:
            owner, repo_name = slug.split("/", 1)
        if not owner or not repo_name:
            continue
        category = str(record.get("failureCategory", "")).upper()
        known_categories = {
            "COMPILATION_FAILURE", "TEST_FAILURE", "ENFORCER_FAILURE",
            "DEPENDENCY_LOCK_FAILURE", "DEPENDENCY_RESOLUTION_FAILURE",
        }
        suggestion = "dependency" if category in known_categories else None
        case_id = f"bump-{path.stem}"
        try:
            result = _write_case(case_id, f"{owner}/{repo_name}", sha, sha, log,
                                 "bump", suggestion)
        except GitHubError:
            skipped_evidence += 1
            continue
        saved += result is not None
    return saved, skipped_evidence


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="dataset", required=True)
    subparsers.add_parser("lca", help="import the Hugging Face default/test split")
    bump_parser = subparsers.add_parser("bump", help="import an existing BUMP checkout")
    bump_parser.add_argument("root", type=Path, help="path to the BUMP repository checkout")
    args = parser.parse_args()
    try:
        if args.dataset == "lca":
            saved, skipped_evidence = import_lca(), 0
        else:
            saved, skipped_evidence = import_bump(args.root)
    except (GitHubError, OSError, ValueError, json.JSONDecodeError) as exc:
        parser.error(str(exc))
    from scripts.collect_ci_corpus import _write_readme

    _write_readme()
    print(
        f"Imported {saved} {args.dataset} case(s); skipped {skipped_evidence} case(s) "
        "without accessible commit evidence. Labels remain for human review."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
