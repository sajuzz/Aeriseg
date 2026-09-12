"""
AeriSeg — Alert Bucket Store

In-memory active buckets (hot path, per-event) + SQLite persistence
(durability across restarts).

Design rule: the hot path (merging a suppressed event into an existing
bucket) NEVER touches disk. Disk writes happen only on bucket
creation, escalation, and expiry/close — three rare events compared
to the volume of raw matching events flowing through.
"""
from __future__ import annotations

import asyncio
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.detection.schemas import AlertBucket, BucketStatus, SampleEvent
from app.db.database import DB_PATH

DEFAULT_DB_PATH = Path(DB_PATH)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS alert_buckets (
    key                     TEXT PRIMARY KEY,
    rule_id                 TEXT NOT NULL,
    alert_id                TEXT NOT NULL,
    base_severity           TEXT NOT NULL,
    severity                TEXT NOT NULL,
    status                  TEXT NOT NULL,
    first_seen              TEXT NOT NULL,
    last_seen               TEXT NOT NULL,
    window_expires_at       TEXT NOT NULL,
    suppression_expires_at  TEXT NOT NULL,
    occurrence_count        INTEGER NOT NULL,
    suppressed_count        INTEGER NOT NULL,
    escalation_level        INTEGER NOT NULL,
    distinct_sources        INTEGER NOT NULL,
    sample_events_json      TEXT NOT NULL,
    closed_at               TEXT
);
CREATE INDEX IF NOT EXISTS idx_alert_buckets_status ON alert_buckets(status);
CREATE INDEX IF NOT EXISTS idx_alert_buckets_rule   ON alert_buckets(rule_id);
"""


class BucketStore:
    """
    Async-safe in-memory store with SQLite durability.
    Call `await store.init()` once at app startup before use.
    """

    def __init__(self, db_path: Path = DEFAULT_DB_PATH):
        self._db_path = db_path
        self._active: dict = {}
        self._lock = asyncio.Lock()

    async def init(self) -> None:
        await asyncio.to_thread(self._init_sync)
        await self._load_open_buckets()

    def _init_sync(self) -> None:
        conn = sqlite3.connect(self._db_path)
        try:
            conn.executescript(_SCHEMA)
            conn.commit()
        finally:
            conn.close()

    async def _load_open_buckets(self) -> None:
        rows = await asyncio.to_thread(self._select_open_sync)
        for row in rows:
            bucket = self._row_to_bucket(row)
            self._active[bucket.key] = bucket

    def _select_open_sync(self) -> list:
        conn = sqlite3.connect(self._db_path)
        try:
            cur = conn.execute(
                "SELECT key, rule_id, alert_id, base_severity, severity, status, "
                "first_seen, last_seen, window_expires_at, suppression_expires_at, "
                "occurrence_count, suppressed_count, escalation_level, "
                "distinct_sources, sample_events_json, closed_at "
                "FROM alert_buckets WHERE status IN ('OPEN','ESCALATED')"
            )
            return cur.fetchall()
        finally:
            conn.close()

    def _row_to_bucket(self, row: tuple) -> AlertBucket:
        (key, rule_id, alert_id, base_sev, sev, status, first_seen, last_seen,
         window_exp, supp_exp, occ, supp_count, esc_level, distinct_src,
         samples_json, _closed_at) = row

        samples = [
            SampleEvent(
                ts=datetime.fromisoformat(s["ts"]),
                summary=s["summary"],
                raw_ref=s.get("raw_ref"),
            )
            for s in json.loads(samples_json)
        ]
        bucket = AlertBucket(
            key=key, rule_id=rule_id, alert_id=alert_id,
            base_severity=base_sev, severity=sev,
            status=BucketStatus(status),
            first_seen=datetime.fromisoformat(first_seen),
            last_seen=datetime.fromisoformat(last_seen),
            window_expires_at=datetime.fromisoformat(window_exp),
            suppression_expires_at=datetime.fromisoformat(supp_exp),
            occurrence_count=occ,
            suppressed_count=supp_count,
            escalation_level=esc_level,
            sample_events=samples,
        )
        # NOTE: distinct_sources is persisted as a COUNT, not the actual set of
        # IPs. After a restart we keep the count for display but resume
        # tracking new distinct values from zero. This is a deliberate,
        # documented tradeoff to avoid storing unbounded IP sets on disk.
        if distinct_src:
            bucket.distinct_sources = {f"__restored__{i}" for i in range(distinct_src)}
        return bucket

    # ── Hot path — in-memory only, no disk I/O ─────────────────

    async def get(self, key: str) -> Optional[AlertBucket]:
        async with self._lock:
            return self._active.get(key)

    async def put(self, bucket: AlertBucket) -> None:
        async with self._lock:
            self._active[bucket.key] = bucket

    async def all_open(self) -> list:
        async with self._lock:
            return list(self._active.values())

    # ── Durable writes — only on create / escalate / close ─────

    async def persist(self, bucket: AlertBucket) -> None:
        await asyncio.to_thread(self._persist_sync, bucket)

    def _persist_sync(self, bucket: AlertBucket) -> None:
        conn = sqlite3.connect(self._db_path)
        try:
            samples_json = json.dumps([
                {"ts": s.ts.isoformat(), "summary": s.summary, "raw_ref": s.raw_ref}
                for s in bucket.sample_events
            ])
            closed_at = (
                datetime.utcnow().isoformat()
                if bucket.status in (BucketStatus.EXPIRED, BucketStatus.CLOSED)
                else None
            )
            conn.execute(
                """
                INSERT INTO alert_buckets (
                    key, rule_id, alert_id, base_severity, severity, status,
                    first_seen, last_seen, window_expires_at, suppression_expires_at,
                    occurrence_count, suppressed_count, escalation_level,
                    distinct_sources, sample_events_json, closed_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(key) DO UPDATE SET
                    severity=excluded.severity,
                    status=excluded.status,
                    last_seen=excluded.last_seen,
                    window_expires_at=excluded.window_expires_at,
                    suppression_expires_at=excluded.suppression_expires_at,
                    occurrence_count=excluded.occurrence_count,
                    suppressed_count=excluded.suppressed_count,
                    escalation_level=excluded.escalation_level,
                    distinct_sources=excluded.distinct_sources,
                    sample_events_json=excluded.sample_events_json,
                    closed_at=excluded.closed_at
                """,
                (
                    bucket.key, bucket.rule_id, bucket.alert_id,
                    bucket.base_severity, bucket.severity, bucket.status.value,
                    bucket.first_seen.isoformat(), bucket.last_seen.isoformat(),
                    bucket.window_expires_at.isoformat(),
                    bucket.suppression_expires_at.isoformat(),
                    bucket.occurrence_count, bucket.suppressed_count,
                    bucket.escalation_level, len(bucket.distinct_sources),
                    samples_json, closed_at,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    async def close_and_evict(self, key: str) -> None:
        async with self._lock:
            bucket = self._active.pop(key, None)
        if bucket:
            bucket.status = BucketStatus.EXPIRED
            await self.persist(bucket)


# Singleton — call `await bucket_store.init()` at app startup
bucket_store = BucketStore()
