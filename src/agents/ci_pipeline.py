"""CI log pipeline: collect pre-rerun evidence, decide, and score a labelled case."""

from __future__ import annotations

import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

from src.ci.facts import FactExtractor, GroqFactExtractor, mask_secrets
from src.ci.tracing import Commit, attribute
from src.ci.truncate import truncate_log
from src.core.engine import ConfidenceEngine
from src.core.models import ConfidenceEngineInput
from src.db.store import DecisionStore

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CASES_DIR = REPO_ROOT / "tests" / "fixtures" / "ci_cases"
CI_CORPUS_DIR = REPO_ROOT / "tests" / "ci_corpus"
UI_LOG_EXCERPT_CHARS = 6000
_CORRECT_ACTION = {"flaky": "rerun", "dependency": "auto-fix", "bug": "escalate", "infra": "escalate"}


def load_cases(dir: Path = DEFAULT_CASES_DIR) -> list[dict[str, Any]]:
    """Load case.yaml and sibling log.txt records from a fixture directory."""
    cases = []
    for case_file in sorted(Path(dir).glob("*/case.yaml")):
        case = yaml.safe_load(case_file.read_text(encoding="utf-8"))
        case["id"] = case.get("id", case_file.parent.name)
        case["log"] = (case_file.parent / case.get("log_file", "log.txt")).read_text(encoding="utf-8")
        cases.append(case)
    return cases


def load_demo_cases() -> list[dict[str, Any]]:
    """Load fixture cases and only corpus cases with complete human review metadata."""
    fixtures = load_cases()
    for case in fixtures:
        case["source_type"] = "fixture"
    reviewed = [
        case for case in load_cases(CI_CORPUS_DIR)
        if isinstance(case.get("label"), str) and case["label"].strip()
        and isinstance(case.get("label_source"), str) and case["label_source"].strip()
    ]
    for case in reviewed:
        case["source_type"] = "historical_github_actions"
    return fixtures + reviewed


def score_case(action: str, classification: str, label: str) -> dict[str, Any]:
    correct_action = _CORRECT_ACTION.get(label)
    return {
        "cause_correct": classification == label,
        "action_acceptable": action == correct_action,
        "masked": (label in {"bug", "dependency"} and action == "rerun")
        or (label in {"flaky", "infra"} and action == "auto-fix"),
        "needless_escalation": action == "escalate" and correct_action is not None and correct_action != "escalate",
    }


def run_case(
    case: dict[str, Any],
    engine: ConfidenceEngine,
    extractor: FactExtractor,
    store: DecisionStore | None = None,
) -> dict[str, Any]:
    """Run one case. Any unexpected failure produces a recorded fail-safe escalation."""
    started = time.perf_counter()
    label = str(case.get("label", ""))
    base = {
        "case_id": case.get("id", "unknown"), "label": label, "status": "ok",
        "source_type": case.get("source_type", "fixture"),
        "repo": case.get("repo"), "run_id": case.get("run_id"),
    }
    try:
        truncated = truncate_log(str(case["log"]))
        safe_log = mask_secrets(truncated.text)
        log_excerpt = safe_log[-UI_LOG_EXCERPT_CHARS:]
        if len(safe_log) > UI_LOG_EXCERPT_CHARS:
            log_excerpt = "[Earlier log content omitted from the UI excerpt.]\n" + log_excerpt
        facts = extractor.extract(safe_log)
        extraction_error = getattr(extractor, "last_error", None)
        if extraction_error:
            result = {
                **base, "status": "extraction_failed",
                "extraction_error": mask_secrets(str(extraction_error)),
                "classification": None, "recommended_action": "escalate",
                "diagnosis_reliable": None,
                "confidence_score": None, "score": None,
                "duration_ms": round((time.perf_counter() - started) * 1000, 3),
            }
            if store is not None:
                store.save_decision({
                    "created_at": datetime.now(timezone.utc).isoformat(), "source": "ci",
                    "run_id": str(case.get("run_id", case.get("id", "unknown"))),
                    "case_id": base["case_id"], "step_id": None, "status": "extraction_failed",
                    "recommended_action": "escalate", "evidence_json": {},
                    "error": result["extraction_error"],
                })
            return result
        commits = [Commit(str(c["sha"]), str(c.get("author", "")), tuple(c.get("files", []))) for c in case.get("commits", [])]
        trace = attribute(facts.failing_files, commits)
        code_link = "failing_file_touched" if trace.attributed_commit else ("not_touched" if facts.failing_files and commits and not trace.candidates else None)
        raw_signals = {
            "failure_kind": facts.failure_kind,
            "dependency_change": "changed" if trace.dependency_change else ("unchanged" if commits else None),
            "code_link": code_link,
            "truncated": truncated.truncated,
        }
        # The reviewed historical corpus currently marks runs medium, while the approved
        # FYP-1 policy has only the default tier. The offline demo uses that configured policy.
        risk_tier = "default" if case.get("source_type") == "historical_github_actions" else case.get("risk_tier", "default")
        context = {
            "risk_tier": risk_tier, "repo": case.get("repo", "fixture"),
            "run_id": str(case.get("run_id", case.get("id", "unknown"))), "case_id": base["case_id"],
            "ambiguous_commit": trace.ambiguous_commit, "attributed_commit": trace.attributed_commit,
        }
        output, details = engine.evaluate_detailed(ConfidenceEngineInput(
            evidence_type="ci_log", source="ci", raw_signals=raw_signals, context=context
        ))
        decision = output.model_dump()
        result = {
            **base, "classification": output.classification, "recommended_action": output.recommended_action,
            "diagnosis_reliable": output.diagnosis_reliable,
            "confidence_score": output.confidence_score, "reasoning_trace": output.reasoning_trace,
            "raw_signals": raw_signals, "context": context, "facts": facts.model_dump(),
            "log_excerpt": log_excerpt,
            "trace": {
                "status": "ambiguous" if trace.ambiguous_commit else (
                    "attributed" if trace.attributed_commit else "no_match"
                ),
                "attributed_commit": trace.attributed_commit,
                "candidates": list(trace.candidates),
                "failing_files": facts.failing_files,
            },
            "details": details, "score": score_case(output.recommended_action, output.classification, label),
            "duration_ms": round((time.perf_counter() - started) * 1000, 3),
        }
        if store is not None:
            store.save_decision({
                "created_at": datetime.now(timezone.utc).isoformat(), "source": "ci",
                "run_id": context["run_id"], "case_id": base["case_id"], "step_id": None,
                "status": "triage", "classification": output.classification,
                "recommended_action": output.recommended_action, "confidence_score": output.confidence_score,
                "evidence_json": {"raw_signals": raw_signals, "context": context},
                "output_json": decision, "details_json": details,
            })
        return result
    except Exception as exc:
        result = {
            **base, "status": "error", "error": mask_secrets(f"{type(exc).__name__}: {exc}"),
            "classification": None, "recommended_action": "escalate", "confidence_score": None,
            "diagnosis_reliable": None,
            "score": score_case("escalate", "error", label),
            "duration_ms": round((time.perf_counter() - started) * 1000, 3),
        }
        if store is not None:
            store.save_decision({
                "created_at": datetime.now(timezone.utc).isoformat(), "source": "ci",
                "run_id": str(case.get("run_id", case.get("id", "unknown"))),
                "case_id": base["case_id"], "step_id": None, "status": "error",
                "recommended_action": "escalate", "evidence_json": {}, "error": result["error"],
            })
        return result


def run_cases(
    ids: list[str] | None = None,
    engine: ConfidenceEngine | None = None,
    extractor: FactExtractor | None = None,
    store: DecisionStore | None = None,
    cases_dir: Path | None = None,
) -> list[dict[str, Any]]:
    engine = engine or ConfidenceEngine()
    extractor = extractor or GroqFactExtractor()
    cases = load_demo_cases() if cases_dir is None else load_cases(cases_dir)
    if ids is not None:
        available = {case["id"] for case in cases}
        unknown = set(ids) - available
        if unknown:
            raise ValueError(f"unknown CI case ids: {sorted(unknown)}")
        cases = [case for case in cases if case["id"] in ids]
    return [run_case(case, engine, extractor, store) for case in cases]
