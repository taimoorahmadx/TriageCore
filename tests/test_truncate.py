from src.ci.truncate import estimate_tokens, truncate_log


def test_short_text_is_unchanged():
    result = truncate_log("one line\n", max_tokens=10)
    assert result.text == "one line\n"
    assert result.truncated is False
    assert result.original_tokens == result.kept_tokens == estimate_tokens(result.text)


def test_large_log_keeps_both_ends_and_one_marker():
    text = "".join(f"line {index}\n" for index in range(100_000))
    result = truncate_log(text, max_tokens=100)
    marker_lines = [line for line in result.text.splitlines() if "lines removed by TriageCore" in line]
    assert result.truncated is True
    assert result.kept_tokens <= 100
    assert result.text.startswith("line 0\n")
    assert result.text.endswith("line 99999\n")
    assert len(marker_lines) == 1


def test_empty_text_works():
    result = truncate_log("")
    assert result.text == ""
    assert result.truncated is False
    assert result.original_tokens == result.kept_tokens == 0


def test_head_share_is_respected_to_within_one_line():
    text = "".join(f"{index:04}\n" for index in range(100))
    result = truncate_log(text, max_tokens=40, head_share=0.3)
    lines = result.text.splitlines()
    marker_index = next(i for i, line in enumerate(lines) if "lines removed by TriageCore" in line)
    head_tokens = estimate_tokens("\n".join(lines[:marker_index]) + "\n")
    tail_tokens = estimate_tokens("\n".join(lines[marker_index + 1 :]) + "\n")
    marker_tokens = estimate_tokens(lines[marker_index] + "\n")
    content_budget = 40 - marker_tokens
    assert abs(head_tokens - content_budget * 0.3) <= 2
    assert abs(tail_tokens - content_budget * 0.7) <= 2
