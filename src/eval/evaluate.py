"""Evaluate decision policies on the QA scenario suite.

Every policy decides on the SAME evidence collected from the browser, so differences
come only from the decision logic:

- ``blind_heal``: what naive self-healing tools do. If a replacement element was found,
  heal (let the test pass).
- ``penalty_rule``: the proposal's original idea, a fixed 100-point score minus
  hand-picked penalties per failure sign, with heal at >= 85. The penalty sizes are
  illustrative (not project weights); they stand in for "a hand-tuned if-else".
- ``simple_rule``: an obvious hand rule that heals only clean, confirmed relocations.
- ``triagecore``: the ConfidenceEngine (Bayesian diagnosis + minimum expected loss).

Usage:  .venv/bin/python -m src.eval.evaluate          (needs GROQ_API_KEY for relocation)
"""

from __future__ import annotations

import csv
import json
import sys
from datetime import datetime
from typing import Any

from src.agents.qa_pipeline import REPO_ROOT, Truth, run_scenarios, score_step
from src.browser.relocator import Relocator
from src.eval.stats import wilson_interval

RESULTS_DIR = REPO_ROOT / "results"
POLICIES = ("blind_heal", "penalty_rule", "simple_rule", "triagecore")


def blind_heal(signals: dict[str, Any]) -> str:
    found = signals.get("relocated_match_count") == 1 or signals.get("original_resolved_after_wait")
    return "heal" if found else "escalate"


def penalty_rule(signals: dict[str, Any]) -> str:
    if not (signals.get("relocated_match_count") == 1 or signals.get("original_resolved_after_wait")):
        return "escalate"
    score = 100
    score -= 40 if (signals.get("uncaught_page_errors") or 0) > 0 else 0
    score -= 30 if signals.get("error_state_shown") else 0
    score -= 25 if signals.get("expected_state_reached") is False else 0
    score -= 15 if (signals.get("failed_requests") or 0) > 0 else 0
    score -= 10 if (signals.get("console_errors") or 0) > 0 else 0
    score -= 20 if signals.get("action_succeeded") is False else 0
    return "heal" if score >= 85 else "escalate"


def simple_rule(signals: dict[str, Any]) -> str:
    """Strongest obvious rule: heal only on a clean, confirmed result."""
    if signals.get("original_resolved_after_wait") is True and signals.get("expected_state_reached") is not False:
        return "flag"
    if (
        signals.get("relocated_match_count") == 1
        and signals.get("expected_state_reached") is True
        and signals.get("uncaught_page_errors") == 0
        and signals.get("error_state_shown") is not True
        and signals.get("failed_requests") == 0
    ):
        return "heal"
    return "escalate"


def summarise(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    summary = {}
    n = len(rows)
    regressions = sum(1 for r in rows if r["truth_cause"] == "likely_regression")
    non_regressions = n - regressions
    for policy in POLICIES:
        acceptable = sum(1 for r in rows if r[f"{policy}_acceptable"])
        masked = sum(1 for r in rows if r[f"{policy}_masked"])
        needless = sum(1 for r in rows if r[f"{policy}_needless"])
        summary[policy] = {
            "steps": n,
            "acceptable_actions": acceptable,
            "accuracy": acceptable / n if n else 0.0,
            "accuracy_ci": wilson_interval(acceptable, n),
            "masked_regressions": masked,
            "regressions_total": regressions,
            # Share of real bugs that were let through without a human: the false-positive rate that matters here.
            "masked_rate": masked / regressions if regressions else 0.0,
            "masked_rate_ci": wilson_interval(masked, regressions),
            "needless_escalations": needless,
            "needless_rate": needless / non_regressions if non_regressions else 0.0,
            "needless_rate_ci": wilson_interval(needless, non_regressions),
        }
    summary["triagecore"]["cause_accuracy"] = sum(1 for r in rows if r["cause_correct"]) / n if n else 0.0
    return summary


def evaluate(relocator: Relocator | None = None, save: bool = True) -> dict[str, Any]:
    started = datetime.now()
    results = run_scenarios(relocator=relocator)
    rows = []
    for res in results:
        for st in res["steps"]:
            if st["status"] == "passed":
                continue  # original selector worked; nothing to triage
            truth = Truth(st["truth"]["cause"], tuple(st["truth"]["acceptable"]))
            if st["status"] == "error":
                row: dict[str, Any] = {
                    "scenario": res["scenario_id"],
                    "step": st["step_id"],
                    "risk_tier": st["risk_tier"],
                    "truth_cause": truth.cause,
                    "acceptable": "|".join(truth.acceptable),
                    "triagecore_cause": "error",
                    "p_stale": None,
                    "p_regression": None,
                    "p_flaky": None,
                    "confidence": None,
                    "proposed_selector": None,
                    "duration_ms": None,
                }
                actions = {policy: "escalate" for policy in POLICIES}
                for policy, action in actions.items():
                    sc = score_step(action, "error", truth)
                    row[f"{policy}_action"] = action
                    row[f"{policy}_acceptable"] = sc["action_acceptable"]
                    row[f"{policy}_masked"] = sc["masked_regression"]
                    row[f"{policy}_needless"] = sc["needless_escalation"]
                row["cause_correct"] = False
                rows.append(row)
                continue
            row: dict[str, Any] = {
                "scenario": res["scenario_id"],
                "step": st["step_id"],
                "risk_tier": st["risk_tier"],
                "truth_cause": truth.cause,
                "acceptable": "|".join(truth.acceptable),
                "triagecore_cause": st["engine"]["classification"],
                "p_stale": round(st["details"]["posterior"]["stale_selector"], 4),
                "p_regression": round(st["details"]["posterior"]["likely_regression"], 4),
                "p_flaky": round(st["details"]["posterior"]["flaky"], 4),
                "confidence": st["engine"]["confidence_score"],
                "proposed_selector": st["context"]["proposed_selector"],
                "duration_ms": st["timings_ms"]["total"],
            }
            actions = {
                "blind_heal": blind_heal(st["raw_signals"]),
                "penalty_rule": penalty_rule(st["raw_signals"]),
                "simple_rule": simple_rule(st["raw_signals"]),
                "triagecore": st["engine"]["recommended_action"],
            }
            for policy, action in actions.items():
                sc = score_step(action, st["engine"]["classification"], truth)
                row[f"{policy}_action"] = action
                row[f"{policy}_acceptable"] = sc["action_acceptable"]
                row[f"{policy}_masked"] = sc["masked_regression"]
                row[f"{policy}_needless"] = sc["needless_escalation"]
            row["cause_correct"] = st["engine"]["classification"] == truth.cause
            rows.append(row)

    report = {
        "generated_at": started.isoformat(timespec="seconds"),
        "relocator": type(relocator).__name__ if relocator else "GroqRelocator",
        "summary": summarise(rows),
        "rows": rows,
        "runs": results,
    }
    if save:
        RESULTS_DIR.mkdir(exist_ok=True)
        stamp = started.strftime("%Y%m%d-%H%M%S")
        (RESULTS_DIR / f"qa_eval_{stamp}.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        (RESULTS_DIR / "qa_eval_latest.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        with (RESULTS_DIR / f"qa_eval_{stamp}.csv").open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
    return report


if __name__ == "__main__":
    report = evaluate()
    print(f"{'policy':14s} {'acceptable':>11s} {'masked bugs':>12s} {'needless esc.':>14s}")
    for policy, s in report["summary"].items():
        print(f"{policy:14s} {s['acceptable_actions']:>5d}/{s['steps']:<5d} "
              f"{s['masked_regressions']:>5d}/{s['regressions_total']:<6d} {s['needless_escalations']:>8d}")
    print(f"\nSaved to {RESULTS_DIR / 'qa_eval_latest.json'}", file=sys.stderr)
