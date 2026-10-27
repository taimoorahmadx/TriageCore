from pathlib import Path

from src.agents.ci_pipeline import load_cases, run_case, run_cases
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


def test_run_cases_rejects_unknown_ids():
    try:
        run_cases(["missing"], engine=ConfidenceEngine(), extractor=FixedFactExtractor(CILogFacts()), cases_dir=FIXTURE_DIR)
    except ValueError as exc:
        assert "missing" in str(exc)
    else:
        raise AssertionError("unknown fixture id was accepted")


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
