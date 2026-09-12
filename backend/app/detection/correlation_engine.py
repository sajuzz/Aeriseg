"""
AeriSeg — Correlation & Throttle Engine (Layer 2)

This is the core mechanism: correlate similar events, suppress
repeats, surface exactly ONE alert per correlated group, and
throttle alert volume so the SOC queue never floods.

Pipeline position:

    Rule Engine match
        -> ExactDedupFilter   (drop byte-identical repeats)
        -> CorrelationEngine  (THIS FILE — group + suppress + throttle)
        -> publish_cb()        (called ONLY on NEW_ALERT or ESCALATED)
        -> NATS publish + Alert/Case creation

Every other matching event for an already-open bucket is merged
silently (action=SUPPRESSED) — it updates occurrence_count and
sample evidence, but never creates a duplicate alert. State is
checkpointed to disk periodically (not on every event) so a crash
loses at most a handful of counter increments, never the bucket
itself and never a duplicate alert_id.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Callable, Optional

import structlog

from app.detection.bucket_store import BucketStore, bucket_store
from app.detection.dedup_filter import ExactDedupFilter, exact_dedup
from app.detection.rate_limiter import TokenBucketLimiter, global_alert_limiter
from app.detection.schemas import (
    AlertBucket,
    BucketStatus,
    EngineAction,
    EngineResult,
    RuleCorrelationConfig,
    fingerprint,
)

log = structlog.get_logger()

# Severity escalation ladder — used when a suppressed bucket crosses escalate_after
_SEVERITY_LADDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def _bump_severity(current: str) -> str:
    try:
        idx = _SEVERITY_LADDER.index(current.upper())
    except ValueError:
        return current
    return _SEVERITY_LADDER[min(idx + 1, len(_SEVERITY_LADDER) - 1)]


class CorrelationEngine:
    def __init__(
        self,
        store: BucketStore = bucket_store,
        dedup: ExactDedupFilter = exact_dedup,
        limiter: TokenBucketLimiter = global_alert_limiter,
        alert_id_factory: Optional[Callable[[], str]] = None,
    ):
        self._store = store
        self._dedup = dedup
        self._limiter = limiter
        self._key_locks: dict = {}
        self._alert_id_factory = alert_id_factory or self._default_alert_id

    @staticmethod
    def _default_alert_id() -> str:
        return "A-" + fingerprint(datetime.utcnow().timestamp())[:8]

    def _lock_for(self, key: str) -> asyncio.Lock:
        if key not in self._key_locks:
            self._key_locks[key] = asyncio.Lock()
        return self._key_locks[key]

    @staticmethod
    def _build_key(cfg: RuleCorrelationConfig, event: dict) -> str:
        dims = tuple(str(event.get(f, "")) for f in cfg.correlate_by)
        return fingerprint(cfg.rule_id, *dims)

    @staticmethod
    def _summarise(event: dict) -> str:
        msg = event.get("message") or event.get("event_type") or "event"
        return str(msg)[:200]

    async def process(
        self,
        cfg: RuleCorrelationConfig,
        event: dict,
        publish_cb: Optional[Callable] = None,
    ) -> EngineResult:
        """
        cfg        — per-rule correlation settings (parsed from rule YAML)
        event      — the raw event dict that matched the rule
        publish_cb — async callable(bucket, action) invoked ONLY when an
                     alert should actually be surfaced to the SOC
                     (NEW_ALERT or ESCALATED). Wire this to your existing
                     NATS publish / alert+case creation path. Never called
                     for SUPPRESSED or DROPPED_* results.
        """
        # ── Layer 1: exact duplicate fast-path ─────────────────
        if await self._dedup.seen_before(event, cfg.rule_id, cfg.exact_dedup_window_secs):
            return EngineResult(action=EngineAction.DROPPED_DUPLICATE, reason="exact duplicate")

        key = self._build_key(cfg, event)
        now = datetime.utcnow()

        async with self._lock_for(key):
            bucket = await self._store.get(key)

            # ── No active bucket → this is a candidate NEW alert ───
            if bucket is None or bucket.status in (BucketStatus.EXPIRED, BucketStatus.CLOSED):
                if not await self._limiter.allow():
                    log.warning("alert_dropped_global_throttle", rule=cfg.rule_id, key=key)
                    return EngineResult(
                        action=EngineAction.DROPPED_GLOBAL_THROTTLE,
                        reason="global alert rate limit exceeded — see /api/detection/correlation/stats",
                    )

                bucket = AlertBucket(
                    key=key,
                    rule_id=cfg.rule_id,
                    alert_id=self._alert_id_factory(),
                    base_severity=event.get("severity", "MEDIUM"),
                    severity=event.get("severity", "MEDIUM"),
                    first_seen=now,
                    last_seen=now,
                    window_expires_at=now + timedelta(seconds=cfg.correlation_window_secs),
                    suppression_expires_at=now + timedelta(seconds=cfg.suppression_secs),
                )
                if event.get("source_ip"):
                    bucket.distinct_sources.add(event["source_ip"])
                bucket.add_sample(self._summarise(event), event.get("log_id"), cfg.max_samples)

                await self._store.put(bucket)
                await self._store.persist(bucket)

                if cfg.threshold == 1:
                    log.info(
                        "correlation_new_alert",
                        rule=cfg.rule_id, key=key, alert_id=bucket.alert_id,
                    )
                    if publish_cb:
                        await publish_cb(bucket, EngineAction.NEW_ALERT)
                    return EngineResult(action=EngineAction.NEW_ALERT, bucket=bucket)
                else:
                    return EngineResult(action=EngineAction.SUPPRESSED, bucket=bucket)

            # ── Active bucket exists → merge this event into it ────
            bucket.occurrence_count += 1
            bucket.last_seen = now
            bucket.window_expires_at = now + timedelta(seconds=cfg.correlation_window_secs)
            if event.get("source_ip"):
                bucket.distinct_sources.add(event["source_ip"])
            bucket.add_sample(self._summarise(event), event.get("log_id"), cfg.max_samples)

            if bucket.occurrence_count == cfg.threshold:
                await self._store.put(bucket)
                await self._store.persist(bucket)
                log.info("correlation_new_alert_threshold_met", rule=cfg.rule_id, key=key, alert_id=bucket.alert_id)
                if publish_cb:
                    await publish_cb(bucket, EngineAction.NEW_ALERT)
                return EngineResult(action=EngineAction.NEW_ALERT, bucket=bucket)

            still_suppressing = now < bucket.suppression_expires_at

            if still_suppressing:
                if bucket.occurrence_count > cfg.threshold:
                    bucket.suppressed_count += 1

                # Escalate ONCE the suppressed volume crosses the threshold —
                # this stays the SAME alert_id, just bumped severity in place.
                # The SOC sees one alert get more urgent, not five new alerts.
                if (
                    bucket.suppressed_count >= cfg.escalate_after
                    and bucket.escalation_level == 0
                ):
                    bucket.escalation_level = 1
                    bucket.severity = _bump_severity(bucket.base_severity)
                    bucket.status = BucketStatus.ESCALATED
                    await self._store.put(bucket)
                    await self._store.persist(bucket)

                    log.warning(
                        "correlation_escalated",
                        rule=cfg.rule_id, key=key, alert_id=bucket.alert_id,
                        suppressed=bucket.suppressed_count,
                        new_severity=bucket.severity,
                    )
                    if publish_cb:
                        await publish_cb(bucket, EngineAction.ESCALATED)
                    return EngineResult(action=EngineAction.ESCALATED, bucket=bucket)

                # Plain merge — in-memory update on every event (no disk I/O,
                # keeps the hot path fast). To bound how much state could be
                # lost on a crash, we checkpoint to disk every 10th suppressed
                # merge rather than only at create/escalate/close. This means
                # a crash can lose at most ~10 increments of occurrence_count,
                # never a duplicate alert_id and never a lost bucket.
                await self._store.put(bucket)
                if bucket.suppressed_count % 10 == 0:
                    await self._store.persist(bucket)
                return EngineResult(action=EngineAction.SUPPRESSED, bucket=bucket)

            # ── Suppression window lapsed: pattern recurred after a quiet
            #    period. We do NOT fire a duplicate alert for the same key —
            #    the SOC may already have this alert_id open in their queue.
            #    We extend its lifetime and reset the suppression cooldown.
            bucket.suppression_expires_at = now + timedelta(seconds=cfg.suppression_secs)
            bucket.suppressed_count += 1
            await self._store.put(bucket)
            await self._store.persist(bucket)
            log.info("correlation_reactivated", rule=cfg.rule_id, key=key, alert_id=bucket.alert_id)
            return EngineResult(
                action=EngineAction.SUPPRESSED,
                bucket=bucket,
                reason="cooldown renewed after quiet period",
            )

# Singleton — wire this into the existing rule evaluation pipeline
correlation_engine = CorrelationEngine()
