"""Create a suggested selector change without modifying the source file."""

from __future__ import annotations

import difflib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def selector_patch(path: Path, original: str, proposed: str) -> str | None:
    """Return a unified diff replacing the first matching selector line, or None."""
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)
    needle = f'original_selector: "{original}"'
    replacement = f'original_selector: "{proposed}"'

    for index, line in enumerate(lines):
        if needle in line:
            lines[index] = line.replace(needle, replacement, 1)
            try:
                display_path = path.resolve().relative_to(REPO_ROOT).as_posix()
            except ValueError:
                display_path = path.name
            return "".join(
                difflib.unified_diff(
                    text.splitlines(keepends=True),
                    lines,
                    fromfile=display_path,
                    tofile=display_path,
                )
            )
    return None
