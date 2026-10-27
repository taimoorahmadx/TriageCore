import asyncio
import hashlib
import hmac
import time
from pathlib import Path

import pytest
from starlette.requests import Request

from src.api.app import app
from src.ci.webhooks import github_webhook

FIXTURES = Path(__file__).parent / "fixtures" / "webhooks"
SECRET = "test-secret"
def signed_headers(body: bytes, *, event: str = "workflow_run", delivery: str = "delivery-1"):
    signature = hmac.new(SECRET.encode(), body, hashlib.sha256).hexdigest()
    return {
        "X-Hub-Signature-256": f"sha256={signature}",
        "X-GitHub-Event": event,
        "X-GitHub-Delivery": delivery,
    }


@pytest.fixture(autouse=True)
def webhook_environment(monkeypatch, tmp_path):
    monkeypatch.setenv("GITHUB_WEBHOOK_SECRET", SECRET)
    monkeypatch.setenv("TRIAGECORE_DB_PATH", str(tmp_path / "webhooks.sqlite3"))


def fixture_bytes(name: str) -> bytes:
    return (FIXTURES / name).read_bytes()


def post(body: bytes, *, event: str = "workflow_run", delivery: str = "delivery-1", headers=None):
    request_headers = signed_headers(body, event=event, delivery=delivery)
    if headers:
        request_headers.update(headers)
    encoded_headers = [(key.lower().encode(), value.encode()) for key, value in request_headers.items()]
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "scheme": "http",
            "path": "/api/ci/webhook",
            "raw_path": b"/api/ci/webhook",
            "query_string": b"",
            "headers": encoded_headers,
            "server": ("testserver", 80),
            "client": ("testclient", 50000),
            "http_version": "1.1",
        },
        receive=lambda: asyncio.sleep(0, result={"type": "http.request", "body": body}),
    )
    started = time.perf_counter()
    response = asyncio.run(github_webhook(request))
    assert time.perf_counter() - started < 2
    return response.status_code, json_response(response)


def json_response(response):
    import json

    return json.loads(response.body)


def test_valid_failure_is_saved_and_accepted():
    response = post(fixture_bytes("workflow_run_failure.json"))
    status, body = response
    assert status == 202
    assert body["accepted"] is True
    assert body["run_id"] == 12345
    assert body["job_id"] > 0


def test_bad_signature_returns_401():
    response = post(
        fixture_bytes("workflow_run_failure.json"),
        headers={"X-Hub-Signature-256": "sha256=wrong"},
    )
    assert response[0] == 401


def test_missing_signature_returns_401():
    response = post(
        fixture_bytes("workflow_run_failure.json"),
        headers={"X-Hub-Signature-256": ""},
    )
    assert response[0] == 401


def test_missing_secret_returns_503(monkeypatch):
    monkeypatch.delenv("GITHUB_WEBHOOK_SECRET")
    response = post(b"{}")
    assert response[0] == 503


def test_signed_non_json_returns_400():
    body = fixture_bytes("not_json.txt")
    assert post(body)[0] == 400


def test_signed_missing_required_field_returns_400():
    assert post(fixture_bytes("missing_head_sha.json"))[0] == 400


def test_success_conclusion_is_not_accepted():
    response = post(fixture_bytes("workflow_run_success.json"))
    assert response[0] == 202
    assert response[1]["accepted"] is False


def test_push_event_is_not_accepted():
    response = post(fixture_bytes("push_event.json"), event="push")
    assert response[0] == 202
    assert response[1]["accepted"] is False


def test_duplicate_delivery_returns_same_job_id():
    body = fixture_bytes("workflow_run_failure.json")
    first = post(body, delivery="duplicate-delivery")[1]
    second = post(body, delivery="duplicate-delivery")[1]
    assert first["job_id"] == second["job_id"]


def test_missing_event_header_returns_400():
    body = fixture_bytes("workflow_run_failure.json")
    response = post(body, headers={"X-GitHub-Event": ""})
    assert response[0] == 400


def test_webhook_route_is_registered():
    assert "/api/ci/webhook" in app.openapi()["paths"]
