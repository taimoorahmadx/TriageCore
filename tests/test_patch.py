from pathlib import Path

from src.agents.patch import selector_patch


def test_selector_patch_changes_only_the_matching_line(tmp_path: Path):
    path = tmp_path / "qa_scenarios.yaml"
    original_text = (
        '  - original_selector: "#old-button"\n'
        '    expected_state_selector: "#ready"\n'
        '  - original_selector: "#other-button"\n'
    )
    path.write_text(original_text, encoding="utf-8")

    patch = selector_patch(path, "#old-button", "#new-button")

    assert patch is not None
    changed_lines = [line for line in patch.splitlines() if line.startswith(("+ ", "- "))]
    assert changed_lines == [
        '-  - original_selector: "#old-button"',
        '+  - original_selector: "#new-button"',
    ]
    assert path.read_text(encoding="utf-8") == original_text


def test_selector_patch_returns_none_for_unknown_selector(tmp_path: Path):
    path = tmp_path / "qa_scenarios.yaml"
    path.write_text('  - original_selector: "#known-button"\n', encoding="utf-8")

    assert selector_patch(path, "#unknown-button", "#replacement") is None
