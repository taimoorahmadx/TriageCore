"""LLM-only action baseline for the QA evaluation."""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from typing import Any, Protocol

from dotenv import load_dotenv

from src.browser.relocator import GROQ_MODEL, GROQ_URL


class Judge(Protocol):
    def decide(self, step: dict[str, Any]) -> str: ...


def build_prompt(step: dict[str, Any]) -> str:
    observations = step.get("observations") or {}
    bounded: dict[str, list[str]] = {}
    if isinstance(observations, dict):
        for name, messages in observations.items():
            if isinstance(messages, list):
                bounded[str(name)] = [str(message)[:200] for message in messages[:5]]
    return (
        "Decide the action for this failed browser test step.\n"
        f"Step name: {step.get('name', step.get('step_id', 'unknown'))}\n"
        f"Risk tier: {step.get('risk_tier', 'unknown')}\n"
        f"Raw signals: {json.dumps(step.get('raw_signals') or {}, ensure_ascii=True)}\n"
        f"Observations: {json.dumps(bounded, ensure_ascii=True)}\n"
        "Reply with exactly one word in backticks: `heal`, `flag` or `escalate`."
    )


def parse_action(reply: str) -> str:
    matches = re.findall(r"`([^`\n]+)`", reply)
    return matches[0] if len(matches) == 1 and matches[0] in {"heal", "flag", "escalate"} else "escalate"


class GroqJudge:
    def __init__(self, api_key: str | None = None, timeout_s: float | None = None, retries: int = 2) -> None:
        load_dotenv()
        self.api_key = api_key or os.environ.get("GROQ_API_KEY")
        self.timeout_s = timeout_s or float(os.environ.get("GROQ_CURL_TIMEOUT_SECONDS", "10"))
        self.retries = retries

    def decide(self, step: dict[str, Any]) -> str:
        if not self.api_key:
            return "escalate"
        body = json.dumps({
            "model": GROQ_MODEL,
            "temperature": 0,
            "messages": [{"role": "user", "content": build_prompt(step)}],
        }).encode()
        for attempt in range(self.retries + 1):
            req = urllib.request.Request(
                GROQ_URL,
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                    "User-Agent": "Mozilla/5.0 (compatible; TriageCore/1.0)",
                },
            )
            try:
                with urllib.request.urlopen(req, timeout=self.timeout_s) as resp:
                    data = json.loads(resp.read())
                reply = data["choices"][0]["message"]["content"]
                return parse_action(reply)
            except (urllib.error.URLError, TimeoutError, KeyError, IndexError, TypeError, json.JSONDecodeError):
                if attempt < self.retries:
                    time.sleep(min(1.5 * (attempt + 1), 2))
        return "escalate"


class FixedJudge:
    """Deterministic judge for evaluation tests."""

    def __init__(self, answer: str) -> None:
        self.answer = answer

    def decide(self, step: dict[str, Any]) -> str:
        del step
        return self.answer if self.answer in {"heal", "flag", "escalate"} else "escalate"
