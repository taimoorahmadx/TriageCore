"""Selector relocation: when a test's selector no longer finds its element, ask an LLM
(Groq, see ADR 003) to propose a new CSS selector from the surrounding HTML.

The LLM only *proposes*. Whether the proposal is used is decided later by the
ConfidenceEngine from post-click evidence. If Groq is unavailable, relocation
fails, and the engine sees "no element relocated" and escalates (fail safe).
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Protocol

from dotenv import load_dotenv

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "openai/gpt-oss-20b"
MAX_HTML_CHARS = 6000


class RelocationError(RuntimeError):
    """The relocator could not produce a selector (missing key, network, unparseable reply)."""


@dataclass(frozen=True)
class RelocationRequest:
    original_selector: str
    intent: str  # what the element is for, e.g. "Add to cart button for the laptop stand"
    html: str  # DOM snippet around where the element should be


class Relocator(Protocol):
    def relocate(self, request: RelocationRequest) -> str: ...


def build_prompt(request: RelocationRequest) -> str:
    html = request.html[:MAX_HTML_CHARS]
    return (
        f"A browser test step failed: no element matches the CSS selector `{request.original_selector}`.\n"
        f"The element's purpose: {request.intent}.\n"
        f"Here is the current HTML around where it should be:\n\n{html}\n\n"
        "Reply with ONLY one CSS selector for the element that serves this purpose, wrapped in single backticks, "
        "e.g. `#new-id`. Prefer an id; otherwise a specific class or attribute selector."
    )


def extract_selector(reply: str) -> str:
    matches = re.findall(r"`([^`\n]+)`", reply)
    if not matches:
        raise RelocationError(f"LLM reply contained no backticked selector: {reply[:200]!r}")
    return matches[-1].strip()


class GroqRelocator:
    def __init__(self, api_key: str | None = None, timeout_s: float | None = None, retries: int = 2) -> None:
        load_dotenv()
        self.api_key = api_key or os.environ.get("GROQ_API_KEY")
        self.timeout_s = timeout_s or float(os.environ.get("GROQ_CURL_TIMEOUT_SECONDS", "10"))
        self.retries = retries

    def relocate(self, request: RelocationRequest) -> str:
        if not self.api_key:
            raise RelocationError("GROQ_API_KEY is not set (add it to .env)")
        body = json.dumps(
            {"model": GROQ_MODEL, "temperature": 0, "messages": [{"role": "user", "content": build_prompt(request)}]}
        ).encode()
        last_error: Exception | None = None
        for attempt in range(self.retries + 1):
            req = urllib.request.Request(
                GROQ_URL,
                data=body,
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"},
            )
            try:
                with urllib.request.urlopen(req, timeout=self.timeout_s) as resp:
                    data = json.loads(resp.read())
                return extract_selector(data["choices"][0]["message"]["content"])
            except (urllib.error.URLError, TimeoutError, KeyError, json.JSONDecodeError, RelocationError) as exc:
                last_error = exc
                if attempt < self.retries:
                    time.sleep(1.5 * (attempt + 1))
        raise RelocationError(f"Groq relocation failed after {self.retries + 1} attempts: {last_error}")


class FixedRelocator:
    """Test double: returns a predetermined selector. For tests of the evidence collector only;
    never used by the real pipeline (that would be the hardcoded answer the PoC relied on)."""

    def __init__(self, selector: str | None) -> None:
        self.selector = selector

    def relocate(self, request: RelocationRequest) -> str:
        if self.selector is None:
            raise RelocationError("FixedRelocator configured to fail")
        return self.selector
