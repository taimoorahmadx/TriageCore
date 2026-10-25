"""QA pipeline: browser evidence -> ConfidenceEngine decision, scored against ground truth.

    scenario (tests/scenarios/qa_scenarios.yaml)
      -> open page in Chromium
      -> for each step: collect_step_evidence()   [src/browser/runner.py]
      -> ConfidenceEngine.evaluate_detailed()       [src/core/engine.py]
      -> compare with the scenario's ground truth

This is the Iteration-1 orchestration in plain Python. LangGraph was considered
and not selected; see ADR 005.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from playwright.sync_api import Browser, sync_playwright

from src.browser.relocator import GroqRelocator, Relocator
from src.browser.runner import (
    DEFAULT_TIMING,
    StepSpec,
    Timing,
    collect_step_evidence,
    serve_directory,
)
from src.core.engine import ConfidenceEngine
from src.core.models import ConfidenceEngineInput

REPO_ROOT = Path(__file__).resolve().parents[2]
DUMMY_DIR = REPO_ROOT / "tests" / "dummy"
SCENARIOS_FILE = REPO_ROOT / "tests" / "scenarios" / "qa_scenarios.yaml"

AUTONOMOUS_OR_HIDING = {"heal", "flag"}  # actions that let a failing step pass without a human


@dataclass(frozen=True)
class Truth:
    cause: str
    acceptable: tuple[str, ...]


@dataclass(frozen=True)
class Scenario:
    id: str
    title: str
    description: str
    page: str  # path under tests/dummy, may include ?query
    steps: tuple[tuple[StepSpec, Truth], ...]


def load_scenarios(path: Path = SCENARIOS_FILE) -> list[Scenario]:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    scenarios = []
    for s in raw["scenarios"]:
        steps = []
        for st in s["steps"]:
            truth = st["truth"]
            spec = StepSpec(
                id=st["id"],
                name=st["name"],
                intent=st["intent"],
                original_selector=st["original_selector"],
                risk_tier=st["risk_tier"],
                expected_state_selector=st.get("expected_state_selector"),
                error_state_selector=st.get("error_state_selector"),
                container_selector=st.get("container_selector"),
            )
            steps.append((spec, Truth(cause=truth["cause"], acceptable=tuple(truth["acceptable"]))))
        scenarios.append(Scenario(s["id"], s["title"], s.get("description", ""), s["page"], tuple(steps)))
    return scenarios


def score_step(action: str, classification: str, truth: Truth) -> dict[str, Any]:
    return {
        "cause_correct": classification == truth.cause,
        "action_acceptable": action in truth.acceptable,
        # The failure TriageCore exists to prevent: a real bug let through without a human.
        "masked_regression": truth.cause == "likely_regression" and action in AUTONOMOUS_OR_HIDING,
        "needless_escalation": action == "escalate" and "escalate" not in truth.acceptable,
    }


def run_scenario(
    scenario: Scenario,
    browser: Browser,
    base_url: str,
    engine: ConfidenceEngine,
    relocator: Relocator,
    timing: Timing = DEFAULT_TIMING,
) -> dict[str, Any]:
    started = time.perf_counter()
    context = browser.new_context()
    page = context.new_page()
    url = f"{base_url}/{scenario.page}"
    page.goto(url)
    steps_out = []
    try:
        for spec, truth in scenario.steps:
            ev = collect_step_evidence(page, spec, relocator, timing)
            step: dict[str, Any] = {
                "step_id": spec.id,
                "name": spec.name,
                "risk_tier": spec.risk_tier,
                "status": ev.status,
                "raw_signals": ev.raw_signals,
                "context": ev.context,
                "observations": ev.observations,
                "relocation_error": ev.relocation_error,
                "timings_ms": ev.timings_ms,
                "truth": {"cause": truth.cause, "acceptable": list(truth.acceptable)},
                "engine": None,
                "details": None,
                "score": None,
            }
            if ev.status == "triage":
                t0 = time.perf_counter()
                out, details = engine.evaluate_detailed(
                    ConfidenceEngineInput(
                        evidence_type="playwright_step", source="qa", raw_signals=ev.raw_signals, context=ev.context
                    )
                )
                step["timings_ms"]["engine"] = round((time.perf_counter() - t0) * 1000, 3)
                step["engine"] = out.model_dump()
                step["details"] = details
                step["score"] = score_step(out.recommended_action, out.classification, truth)
            steps_out.append(step)
    finally:
        context.close()
    return {
        "scenario_id": scenario.id,
        "title": scenario.title,
        "description": scenario.description,
        "page": scenario.page,
        "duration_ms": int((time.perf_counter() - started) * 1000),
        "steps": steps_out,
    }


def run_scenarios(
    scenario_ids: list[str] | None = None,
    engine: ConfidenceEngine | None = None,
    relocator: Relocator | None = None,
    headless: bool = True,
    base_url: str | None = None,
) -> list[dict[str, Any]]:
    """Run the given scenarios (all if None) in one browser session."""
    engine = engine or ConfidenceEngine()
    relocator = relocator or GroqRelocator()
    scenarios = load_scenarios()
    if scenario_ids is not None:
        unknown = set(scenario_ids) - {s.id for s in scenarios}
        if unknown:
            raise ValueError(f"unknown scenario ids: {sorted(unknown)}")
        scenarios = [s for s in scenarios if s.id in scenario_ids]

    def _run(url: str) -> list[dict[str, Any]]:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=headless)
            try:
                return [run_scenario(s, browser, url, engine, relocator) for s in scenarios]
            finally:
                browser.close()

    if base_url:
        return _run(base_url)
    with serve_directory(DUMMY_DIR) as url:
        return _run(url)


if __name__ == "__main__":
    import sys

    ids = sys.argv[1:] or None
    for result in run_scenarios(ids):
        print(f"\n== {result['title']} ({result['duration_ms']} ms)")
        for st in result["steps"]:
            if st["engine"] is None:
                print(f"  {st['name']}: passed without triage")
                continue
            e, sc = st["engine"], st["score"]
            mark = "OK " if sc["action_acceptable"] else "XX "
            print(f"  {mark}{st['name']} [{st['risk_tier']}]: {e['recommended_action']} "
                  f"(cause {e['classification']}, confidence {e['confidence_score']}) "
                  f"truth={st['truth']['cause']}  selector={st['context']['proposed_selector']}")
            if st["relocation_error"]:
                print(f"     relocation: {st['relocation_error']}")
