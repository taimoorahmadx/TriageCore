from __future__ import annotations

import json
from typing import Any

import pytest

from src.ci.facts import CILogFacts, FixedFactExtractor, GroqFactExtractor, mask_secrets


class FakeResponse:
    def __init__(self, content: str) -> None:
        self.content = content

    def __enter__(self) -> FakeResponse:
        return self

    def __exit__(self, *args: Any) -> None:
        return None

    def read(self) -> bytes:
        return json.dumps({"choices": [{"message": {"content": self.content}}]}).encode()


def test_fixed_extractor_round_trips_facts() -> None:
    facts = CILogFacts(
        failure_kind="test_assertion",
        failing_files=["tests/test_api.py"],
        error_excerpt="assert 1 == 2",
    )

    extracted = FixedFactExtractor(facts).extract("irrelevant log")

    assert CILogFacts.model_validate(extracted.model_dump()) == facts
    assert extracted is not facts


@pytest.mark.parametrize("replies", [["not json", "still not json"], ['{"failure_kind":"not_allowed"}', '{"failure_kind":"not_allowed"}']])
def test_groq_extractor_returns_empty_facts_after_two_invalid_replies(
    monkeypatch: pytest.MonkeyPatch, replies: list[str]
) -> None:
    calls = 0

    def fake_urlopen(request: Any, timeout: float) -> FakeResponse:
        nonlocal calls
        reply = replies[calls]
        calls += 1
        return FakeResponse(reply)

    monkeypatch.setattr("src.ci.facts.urllib.request.urlopen", fake_urlopen)
    monkeypatch.setattr("src.ci.facts.time.sleep", lambda _: None)
    extractor = GroqFactExtractor(api_key="test-key")

    facts = extractor.extract("a failing test log")

    assert calls == 2
    assert facts == CILogFacts()
    assert extractor.last_error is not None


def test_mask_secrets_masks_github_and_groq_tokens() -> None:
    masked = mask_secrets("GH ghp_abcdefgh123 GQ gsk_zyxwvu987")

    assert "ghp_abcdefgh123" not in masked
    assert "gsk_zyxwvu987" not in masked
    assert masked.count("[REDACTED]") == 2
