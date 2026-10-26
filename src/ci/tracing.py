"""Attribute CI failures to recent commits without guessing when attribution is ambiguous."""

from dataclasses import dataclass
from pathlib import PurePosixPath


@dataclass(frozen=True)
class Commit:
    sha: str
    author: str
    files: tuple[str, ...]


@dataclass(frozen=True)
class Attribution:
    attributed_commit: str | None
    candidates: tuple[str, ...]
    ambiguous_commit: bool
    dependency_change: bool


_DEPENDENCY_FILES = {
    "package.json",
    "package-lock.json",
    "pyproject.toml",
    "poetry.lock",
    "go.sum",
}


def _normalise_path(path: str) -> str:
    return path.replace("\\", "/").removeprefix("./")


def _paths_match(failing_path: str, commit_path: str) -> bool:
    failing = _normalise_path(failing_path)
    changed = _normalise_path(commit_path)
    return (
        failing == changed
        or failing.endswith("/" + changed)
        or changed.endswith("/" + failing)
    )


def _is_dependency_file(path: str) -> bool:
    filename = PurePosixPath(_normalise_path(path)).name
    return filename in _DEPENDENCY_FILES or (filename.startswith("requirements") and filename.endswith(".txt"))


def attribute(
    failing_files: list[str], commits: list[Commit], max_commits: int = 10
) -> Attribution:
    """Find recent commits touching failing files and detect dependency-file changes.

    Commits must be ordered most recent first. Multiple candidates are reported as ambiguous;
    this function never picks one of them.
    """
    if max_commits < 0:
        raise ValueError("max_commits must be non-negative")

    recent = commits[:max_commits]
    candidates = tuple(
        commit.sha
        for commit in recent
        if any(_paths_match(failing, changed) for failing in failing_files for changed in commit.files)
    )
    ambiguous = len(candidates) >= 2
    return Attribution(
        attributed_commit=candidates[0] if len(candidates) == 1 else None,
        candidates=candidates,
        ambiguous_commit=ambiguous,
        dependency_change=any(_is_dependency_file(path) for commit in recent for path in commit.files),
    )
