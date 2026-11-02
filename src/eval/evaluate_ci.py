"""Preliminary CI fixture comparison using the frozen, provisional C9 weights."""

from __future__ import annotations

import csv
import json
import re
import statistics
from datetime import datetime
from typing import Any

from src.agents.ci_pipeline import DEFAULT_CASES_DIR, REPO_ROOT, load_cases, run_cases, score_case
from src.ci.facts import FactExtractor
from src.core.engine import ConfidenceEngine
from src.eval.stats import wilson_interval

RESULTS_DIR = REPO_ROOT / "results"
POLICIES = ("rerun_all", "keyword_rule", "triagecore")


def keyword_rule(log: str) -> str:
    if re.search(r"timeout|ECONNRESET|503", log, re.IGNORECASE):
        return "rerun"
    if re.search(r"npm ERR|ModuleNotFoundError|could not resolve", log, re.IGNORECASE):
        return "auto-fix"
    return "escalate"


def _percentiles(values: list[float]) -> dict[str, float | None]:
    if not values:
        return {"p50": None, "p95": None}
    if len(values) == 1:
        return {"p50": values[0], "p95": values[0]}
    points = statistics.quantiles(values, n=20)
    return {"p50": points[9], "p95": points[18]}


def summarise(rows: list[dict[str, Any]]) -> dict[str, Any]:
    n = len(rows)
    masked_total = sum(r["label"] in {"bug", "dependency"} for r in rows)
    non_escalatable = sum(r["label"] in {"flaky", "dependency", "bug"} for r in rows)
    summary: dict[str, Any] = {}
    for policy in POLICIES:
        correct = sum(r[f"{policy}_action_acceptable"] for r in rows)
        masked = sum(r[f"{policy}_masked"] for r in rows)
        needless = sum(r[f"{policy}_needless"] for r in rows)
        summary[policy] = {
            "steps": n, "acceptable_actions": correct, "accuracy": correct / n if n else 0.0,
            "accuracy_ci": wilson_interval(correct, n), "masked_regressions": masked,
            "regressions_total": masked_total, "masked_rate": masked / masked_total if masked_total else 0.0,
            "masked_rate_ci": wilson_interval(masked, masked_total),
            "needless_escalations": needless,
            "needless_rate": needless / non_escalatable if non_escalatable else 0.0,
            "needless_rate_ci": wilson_interval(needless, non_escalatable),
        }
    triage = summary["triagecore"]
    triage["cause_accuracy"] = sum(r["triagecore_cause_correct"] for r in rows) / n if n else 0.0
    summary["timing"] = {"duration_ms": _percentiles([r["duration_ms"] for r in rows if r["duration_ms"] is not None])}
    return summary


def evaluate(
    engine: ConfidenceEngine | None = None,
    extractor: FactExtractor | None = None,
    save: bool = True,
) -> dict[str, Any]:
    started = datetime.now()
    cases = load_cases()
    raw_results = run_cases(engine=engine, extractor=extractor, cases_dir=DEFAULT_CASES_DIR)
    logs = {case["id"]: case["log"] for case in cases}
    rows = []
    for result in raw_results:
        log = logs.get(result["case_id"], "")
        actions = {
            "rerun_all": "rerun", "keyword_rule": keyword_rule(log),
            "triagecore": result["recommended_action"],
        }
        row: dict[str, Any] = {
            "case_id": result["case_id"], "label": result["label"], "status": result["status"],
            "triagecore_cause": result.get("classification"),
            "triagecore_cause_correct": (result.get("score") or {}).get("cause_correct", False),
            "duration_ms": result["duration_ms"],
            "failure_kind": result.get("raw_signals", {}).get("failure_kind"),
            "confidence_score": result.get("confidence_score"),
        }
        if result["status"] == "ok":
            for policy, action in actions.items():
                score = score_case(action, result.get("classification") or "error", result["label"])
                row[f"{policy}_action"] = action
                row[f"{policy}_action_acceptable"] = score["action_acceptable"]
                row[f"{policy}_masked"] = score["masked"]
                row[f"{policy}_needless"] = score["needless_escalation"]
        else:
            row["triagecore_action"] = result.get("recommended_action")
        rows.append(row)
    scored_rows = [row for row in rows if row["status"] == "ok"]
    extraction_failures = sum(row["status"] == "extraction_failed" for row in rows)
    pipeline_errors = sum(row["status"] == "error" for row in rows)
    report = {
        "generated_at": started.isoformat(timespec="seconds"), "evaluation_type": "preliminary_fixture_smoke",
        "scope": "two-fixture preliminary smoke check; not real-world CI effectiveness evidence",
        "fixture_count": len(cases), "scored_case_count": len(scored_rows),
        "extraction_failure_count": extraction_failures, "pipeline_error_count": pipeline_errors,
        "weights": "provisional C9 values; not tuned on fixture cases",
        "summary": summarise(scored_rows), "rows": rows, "runs": raw_results,
    }
    if save:
        RESULTS_DIR.mkdir(exist_ok=True)
        stamp = started.strftime("%Y%m%d-%H%M%S")
        encoded = json.dumps(report, indent=2)
        (RESULTS_DIR / f"ci_eval_{stamp}.json").write_text(encoded, encoding="utf-8")
        (RESULTS_DIR / "ci_eval_latest.json").write_text(encoded, encoding="utf-8")
        with (RESULTS_DIR / f"ci_eval_{stamp}.csv").open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0]) if rows else ["case_id", "label"])
            writer.writeheader()
            writer.writerows(rows)
    return report


if __name__ == "__main__":
    report = evaluate()
    print(f"Fixtures: {report['fixture_count']}; scored: {report['scored_case_count']}; "
          f"extraction failures: {report['extraction_failure_count']}; "
          f"pipeline errors: {report['pipeline_error_count']}")
    print(f"{'policy':14s} {'acceptable':>11s} {'masked':>10s} {'needless':>10s}")
    for policy in POLICIES:
        row = report["summary"][policy]
        print(f"{policy:14s} {row['acceptable_actions']:>5d}/{row['steps']:<5d} "
              f"{row['masked_regressions']:>5d}/{row['regressions_total']:<4d} "
              f"{row['needless_escalations']:>5d}")
