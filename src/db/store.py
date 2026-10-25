"""SQLite persistence for QA decisions and incoming CI jobs."""

from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol

REPO_ROOT = Path(__file__).resolve().parents[2]


class DecisionStore(Protocol):
    def save_decision(self, record: dict) -> int: ...

    def list_decisions(self, limit: int = 50, source: str | None = None) -> list[dict]: ...

    def save_ci_job(self, job: dict) -> int: ...


class SqliteStore:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS decisions (
                    id INTEGER PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    source TEXT NOT NULL,
                    run_id TEXT NOT NULL,
                    case_id TEXT NOT NULL,
                    step_id TEXT,
                    status TEXT NOT NULL,
                    classification TEXT,
                    recommended_action TEXT,
                    confidence_score INTEGER,
                    evidence_json TEXT NOT NULL,
                    output_json TEXT,
                    details_json TEXT,
                    error TEXT
                );
                CREATE TABLE IF NOT EXISTS ci_jobs (
                    id INTEGER PRIMARY KEY,
                    received_at TEXT NOT NULL,
                    delivery_id TEXT NOT NULL UNIQUE,
                    repo TEXT NOT NULL,
                    run_id INTEGER NOT NULL,
                    head_sha TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    state TEXT NOT NULL DEFAULT 'pending'
                );
                """
            )

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    @staticmethod
    def _dump(value: object) -> str:
        return json.dumps(value, ensure_ascii=False)

    def save_decision(self, record: dict) -> int:
        fields = (
            "created_at", "source", "run_id", "case_id", "step_id", "status",
            "classification", "recommended_action", "confidence_score", "evidence_json",
            "output_json", "details_json", "error",
        )
        values = [record.get(name) for name in fields]
        for index in (9, 10, 11):
            if values[index] is not None and not isinstance(values[index], str):
                values[index] = self._dump(values[index])
        with self._connect() as connection:
            cursor = connection.execute(
                f"INSERT INTO decisions ({', '.join(fields)}) VALUES ({', '.join('?' for _ in fields)})",
                values,
            )
            return int(cursor.lastrowid)

    def list_decisions(self, limit: int = 50, source: str | None = None) -> list[dict]:
        query = "SELECT * FROM decisions"
        params: tuple[object, ...] = ()
        if source is not None:
            query += " WHERE source = ?"
            params = (source,)
        query += " ORDER BY id DESC LIMIT ?"
        params += (limit,)
        with self._connect() as connection:
            rows = connection.execute(query, params).fetchall()
        records = [dict(row) for row in rows]
        for record in records:
            for key in ("evidence_json", "output_json", "details_json"):
                raw = record.pop(key)
                record[key.removesuffix("_json")] = json.loads(raw) if raw is not None else None
        return records

    def save_ci_job(self, job: dict) -> int:
        with self._connect() as connection:
            connection.execute(
                """INSERT INTO ci_jobs
                   (received_at, delivery_id, repo, run_id, head_sha, payload_json, state)
                   VALUES (?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(delivery_id) DO NOTHING""",
                (
                    job.get("received_at") or datetime.now(timezone.utc).isoformat(),
                    job["delivery_id"], job["repo"], job["run_id"], job["head_sha"],
                    self._dump(job["payload_json"] if "payload_json" in job else job.get("payload")),
                    job.get("state", "pending"),
                ),
            )
            row = connection.execute(
                "SELECT id FROM ci_jobs WHERE delivery_id = ?", (job["delivery_id"],)
            ).fetchone()
            return int(row["id"])


def default_store() -> SqliteStore:
    configured = os.environ.get("TRIAGECORE_DB_PATH")
    path = Path(configured) if configured else REPO_ROOT / "data" / "triagecore.sqlite3"
    return SqliteStore(path)
