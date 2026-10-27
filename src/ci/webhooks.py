"""GitHub Actions webhook intake."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from src.db.store import default_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ci", tags=["ci"])


@router.post("/webhook")
async def github_webhook(request: Request) -> JSONResponse:
    body = await request.body()
    secret = os.environ.get("GITHUB_WEBHOOK_SECRET")
    if not secret:
        return JSONResponse({"detail": "webhook secret not configured"}, status_code=503)

    supplied_signature = request.headers.get("X-Hub-Signature-256", "")
    expected_signature = "sha256=" + hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(supplied_signature, expected_signature):
        return JSONResponse({"detail": "invalid signature"}, status_code=401)

    try:
        payload = json.loads(body)
        if not isinstance(payload, dict):
            raise ValueError("webhook payload must be an object")
        event = request.headers.get("X-GitHub-Event")
        if not event:
            return JSONResponse({"detail": "missing event header"}, status_code=400)

        workflow_run = payload.get("workflow_run")
        if event != "workflow_run":
            return JSONResponse(
                {"accepted": False, "reason": "unsupported event"}, status_code=202
            )
        if not isinstance(workflow_run, dict):
            workflow_run = {}
        if payload.get("action") != "completed":
            return JSONResponse(
                {"accepted": False, "reason": "workflow run is not completed"},
                status_code=202,
            )
        if workflow_run.get("conclusion") != "failure":
            return JSONResponse(
                {"accepted": False, "reason": "workflow run did not fail"},
                status_code=202,
            )

        repository = payload.get("repository")
        delivery_id = request.headers.get("X-GitHub-Delivery")
        run_id = workflow_run.get("id")
        head_sha = workflow_run.get("head_sha")
        repo = repository.get("full_name") if isinstance(repository, dict) else None
        if not all((run_id, head_sha, repo, delivery_id)):
            return JSONResponse({"detail": "missing required webhook fields"}, status_code=400)

        job_id = default_store().save_ci_job(
            {
                "delivery_id": delivery_id,
                "repo": repo,
                "run_id": int(run_id),
                "head_sha": head_sha,
                "payload": payload,
                "state": "pending",
            }
        )
        return JSONResponse(
            {"accepted": True, "run_id": int(run_id), "job_id": job_id}, status_code=202
        )
    except Exception:
        logger.exception("Rejected malformed GitHub webhook")
        return JSONResponse({"detail": "invalid webhook payload"}, status_code=400)
