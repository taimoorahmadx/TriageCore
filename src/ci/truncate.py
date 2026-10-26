"""Token-budgeted truncation for CI logs."""

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class TruncatedLog:
    text: str
    truncated: bool
    original_tokens: int
    kept_tokens: int


def estimate_tokens(text: str) -> int:
    """Estimate token count at four characters per token, rounded up."""
    return math.ceil(len(text) / 4)


def truncate_log(text: str, max_tokens: int = 16000, head_share: float = 0.3) -> TruncatedLog:
    """Keep the beginning and end of a log within a token budget."""
    if max_tokens < 1:
        raise ValueError("max_tokens must be positive")
    if not 0 <= head_share <= 1:
        raise ValueError("head_share must be between 0 and 1")

    original_tokens = estimate_tokens(text)
    if original_tokens <= max_tokens:
        return TruncatedLog(text, False, original_tokens, original_tokens)

    lines = text.splitlines(keepends=True)
    if not lines:
        return TruncatedLog(text, False, original_tokens, original_tokens)

    # A single oversized line has no line boundaries to preserve, so retain character
    # slices from both ends around the same marker used for multi-line logs.
    marker = f"[... {len(lines)} lines removed by TriageCore ...]\n"
    if len(lines) == 1 and estimate_tokens(lines[0]) > max_tokens:
        marker_tokens = estimate_tokens(marker)
        available_chars = max(0, (max_tokens - marker_tokens) * 4)
        head_chars = int(available_chars * head_share)
        tail_chars = available_chars - head_chars
        kept = lines[0][:head_chars] + marker + (lines[0][-tail_chars:] if tail_chars else "")
        while estimate_tokens(kept) > max_tokens and (head_chars or tail_chars):
            if tail_chars >= head_chars and tail_chars:
                tail_chars -= 1
            elif head_chars:
                head_chars -= 1
            kept = lines[0][:head_chars] + marker + (lines[0][-tail_chars:] if tail_chars else "")
        return TruncatedLog(kept, True, original_tokens, estimate_tokens(kept))

    marker = f"[... {len(lines)} lines removed by TriageCore ...]\n"
    content_budget = max(0, max_tokens - estimate_tokens(marker))
    head_budget = int(content_budget * head_share)
    tail_budget = content_budget - head_budget
    head: list[str] = []
    tail: list[str] = []
    head_tokens = 0
    tail_tokens = 0
    start, end = 0, len(lines)

    while start < end and estimate_tokens("".join(head) + lines[start]) <= head_budget:
        line = lines[start]
        head.append(line)
        head_tokens = estimate_tokens("".join(head))
        start += 1

    while start < end and estimate_tokens(lines[end - 1] + "".join(tail)) <= tail_budget:
        line = lines[end - 1]
        tail.insert(0, line)
        tail_tokens = estimate_tokens("".join(tail))
        end -= 1

    removed_lines = end - start
    marker = f"[... {removed_lines} lines removed by TriageCore ...]\n"
    kept = "".join(head) + marker + "".join(tail)

    # Ceil rounding across concatenated fragments can add a token at a boundary.
    # Drop boundary lines until the complete result respects the requested budget.
    while estimate_tokens(kept) > max_tokens and (head or tail):
        if tail and (not head or tail_tokens >= head_tokens):
            tail.pop(0)
            tail_tokens = estimate_tokens("".join(tail))
        elif head:
            head.pop()
            head_tokens = estimate_tokens("".join(head))
        removed_lines = len(lines) - len(head) - len(tail)
        marker = f"[... {removed_lines} lines removed by TriageCore ...]\n"
        kept = "".join(head) + marker + "".join(tail)

    return TruncatedLog(kept, True, original_tokens, estimate_tokens(kept))
