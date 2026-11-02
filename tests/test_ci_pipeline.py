from pathlib import Path

from src.agents.ci_pipeline import load_cases, load_demo_cases, run_case, run_cases, score_case
from src.ci.facts import CILogFacts, FixedFactExtractor
from src.core.engine import ConfidenceEngine
from src.eval.evaluate_ci import evaluate, keyword_rule

FIXTURE_DIR = Path(__file__).parent / "fixtures" / "ci_cases"


def test_load_cases_reads_the_two_smoke_fixtures():
    cases = load_cases(FIXTURE_DIR)
    assert {case["id"] for case in cases} == {"dependency_failure", "hosted_runner_timeout"}
    assert all(case["log"] for case in cases)


def test_run_case_builds_ci_evidence_and_decision():
    case = load_cases(FIXTURE_DIR)[0]
    extractor = FixedFactExtractor(CILogFacts(
        failure_kind="dependency_resolution", failing_files=["requirements.txt"]
    ))

    result = run_case(case, ConfidenceEngine(), extractor)

    assert result["status"] == "ok"
    assert isinstance(result["diagnosis_reliable"], bool)
    assert result["raw_signals"]["failure_kind"] == "dependency_resolution"
    assert result["raw_signals"]["dependency_change"] == "changed"
    assert result["context"]["attributed_commit"] == "dependency-change-1"
    assert result["recommended_action"] in {"rerun", "auto-fix", "escalate"}
    assert set(result["score"]) == {"cause_correct", "action_acceptable", "masked", "needless_escalation"}


def test_unexpected_pipeline_failure_escalates():
    case = load_cases(FIXTURE_DIR)[0]

    class BrokenExtractor:
        def extract(self, log):
            raise RuntimeError("extractor failed")

    result = run_case(case, ConfidenceEngine(), BrokenExtractor())
    assert result["status"] == "error"
    assert result["recommended_action"] == "escalate"
    assert result["score"]["needless_escalation"]


def test_extraction_failure_is_reported_without_fabricated_facts():
    case = load_cases(FIXTURE_DIR)[0]

    class FailedExtractor:
        last_error = "Groq failed for gsk_abcdefghijklmnopqrstuvwxyz"

        def extract(self, log):
            return CILogFacts()

    result = run_case(case, ConfidenceEngine(), FailedExtractor())

    assert result["status"] == "extraction_failed"
    assert result["recommended_action"] == "escalate"
    assert result["classification"] is None
    assert result["score"] is None
    assert "[REDACTED]" in result["extraction_error"]
    assert "gsk_" not in result["extraction_error"]
    assert "facts" not in result


def test_bug_ground_truth_requires_escalation():
    score = score_case("escalate", "bug", "bug")

    assert score["cause_correct"] is True
    assert score["action_acceptable"] is True
    assert score["needless_escalation"] is False


def test_bug_ground_truth_does_not_accept_auto_fix():
    score = score_case("auto-fix", "bug", "bug")

    assert score["action_acceptable"] is False
    assert score["masked"] is False


def test_evaluation_excludes_extraction_failures_from_metrics():
    class FailedExtractor:
        last_error = "provider unavailable"

        def extract(self, log):
            return CILogFacts()

    report = evaluate(engine=ConfidenceEngine(), extractor=FailedExtractor(), save=False)

    assert report["fixture_count"] == 2
    assert report["scored_case_count"] == 0
    assert report["extraction_failure_count"] == 2
    assert report["summary"]["triagecore"]["steps"] == 0
    assert all("triagecore_action_acceptable" not in row for row in report["rows"])


def test_run_cases_rejects_unknown_ids():
    try:
        run_cases(["missing"], engine=ConfidenceEngine(), extractor=FixedFactExtractor(CILogFacts()), cases_dir=FIXTURE_DIR)
    except ValueError as exc:
        assert "missing" in str(exc)
    else:
        raise AssertionError("unknown fixture id was accepted")


def test_demo_catalog_includes_only_reviewed_historical_cases():
    cases = load_demo_cases()
    historical = [case for case in cases if case["source_type"] == "historical_github_actions"]
    assert historical
    assert all(case.get("label") and case.get("label_source") for case in historical)
    assert {case["id"] for case in cases if case["source_type"] == "fixture"} == {
        "dependency_failure", "hosted_runner_timeout"
    }


def test_reviewed_historical_case_runs_through_pipeline():
    case = next(case for case in load_demo_cases() if case["source_type"] == "historical_github_actions")
    result = run_cases(
        [case["id"]], engine=ConfidenceEngine(),
        extractor=FixedFactExtractor(CILogFacts(failure_kind="other")),
    )[0]
    assert result["status"] == "ok"
    assert result["source_type"] == "historical_github_actions"
    assert result["repo"] == case["repo"]
    assert result["run_id"] == case["run_id"]
    assert result["context"]["risk_tier"] == "default"
    assert result["facts"]["failure_kind"] == "other"
    assert result["reasoning_trace"]


def test_evaluation_reports_policies_intervals_and_preliminary_status():
    report = evaluate(
        engine=ConfidenceEngine(),
        extractor=FixedFactExtractor(CILogFacts(failure_kind="other")),
        save=False,
    )
    assert report["evaluation_type"] == "preliminary_fixture_smoke"
    assert set(report["summary"]) == {"rerun_all", "keyword_rule", "triagecore", "timing"}
    assert "accuracy_ci" in report["summary"]["triagecore"]
    assert set(report["summary"]["timing"]["duration_ms"]) == {"p50", "p95"}


def test_keyword_baseline_patterns():
    assert keyword_rule("network timeout") == "rerun"
    assert keyword_rule("ModuleNotFoundError: missing") == "auto-fix"
    assert keyword_rule("tests failed") == "escalate"
