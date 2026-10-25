from __future__ import annotations

import json

from src.db.store import SqliteStore


def test_decisions_round_trip_and_list_newest_first(tmp_path):
    store = SqliteStore(tmp_path / "nested" / "decisions.sqlite3")
    first = {
        "created_at": "2026-10-26T10:00:00+00:00",
        "source": "qa",
        "run_id": "run-1",
        "case_id": "scenario-1",
        "step_id": "step-1",
        "status": "triage",
        "classification": "stale_selector",
        "recommended_action": "heal",
        "confidence_score": 91,
        "evidence_json": {"signal": [1, 2]},
        "output_json": {"recommended_action": "heal"},
        "details_json": {"posterior": {"stale_selector": 0.91}},
        "error": None,
    }
    second = {**first, "run_id": "run-2", "case_id": "scenario-2", "evidence_json": {"ok": True}}

    first_id = store.save_decision(first)
    second_id = store.save_decision(second)
    records = store.list_decisions()

    assert first_id < second_id
    assert [record["run_id"] for record in records] == ["run-2", "run-1"]
    assert records[1]["evidence"]["signal"] == [1, 2]
    assert records[1]["output"] == first["output_json"]
    assert records[1]["details"] == first["details_json"]
    assert json.loads(json.dumps(records[1]["evidence"])) == first["evidence_json"]


def test_duplicate_ci_delivery_returns_existing_id(tmp_path):
    store = SqliteStore(tmp_path / "decisions.sqlite3")
    job = {
        "delivery_id": "delivery-1",
        "repo": "owner/repo",
        "run_id": 42,
        "head_sha": "abc123",
        "payload": {"action": "completed"},
    }

    first_id = store.save_ci_job(job)
    duplicate_id = store.save_ci_job(job)

    assert first_id == duplicate_id
