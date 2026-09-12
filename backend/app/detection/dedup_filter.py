"""
AeriSeg — Layer 1: Exact Duplicate Filter

Drops byte-identical repeated events caused by:
  - sensor retransmission
  - NATS at-least-once redelivery
  - upstream agent retry logic

This is intentionally dumb and fast — pure hash + TTL, no correlation
logic. Correlation of *similar but not identical* events happens one
layer up, in correlation_engine.py.
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Optional

from app.detection.schemas import fingerprint


@dataclass
class _Entry:
    expires_at: float


class ExactDedupFilter:
    """
    Async-safe. Call `seen_before()` before handing an event to the
    correlation engine. Returns True if this exact event content was
    already processed within the configured window — caller drops it.
    """

    def __init__(self, default_window_secs: float = 2.0, max_entries: int = 50_000):
        self._store: dict = {}
        self._lock = asyncio.Lock()
        self._default_window = default_window_secs
        self._max_entries = max_entries

    @staticmethod
    def _key(event: dict, rule_id: str) -> str:
        # Fingerprint the fields that define "the same event" — timestamps and
        # internal/transport IDs are deliberately excluded so a retried event
        # with a new transport ID but identical content still collapses.
        return fingerprint(
            rule_id,
            event.get("source_ip", ""),
            event.get("dest_ip", ""),
            event.get("message", ""),
            event.get("event_type", ""),
        )

    async def seen_before(
        self,
        event: dict,
        rule_id: str,
        window_secs: Optional[float] = None,
    ) -> bool:
        window = window_secs or self._default_window
        key = self._key(event, rule_id)
        now = time.monotonic()

        async with self._lock:
            self._evict_if_needed(now)
            entry = self._store.get(key)
            if entry and entry.expires_at > now:
                return True
            self._store[key] = _Entry(expires_at=now + window)
            return False

    def _evict_if_needed(self, now: float) -> None:
        # Lazy eviction — only sweep when over budget, keeps the hot path O(1) normally.
        if len(self._store) <= self._max_entries:
            return
        expired = [k for k, v in self._store.items() if v.expires_at <= now]
        for k in expired:
            del self._store[k]
        if len(self._store) > self._max_entries:
            overflow = len(self._store) - self._max_entries
            for k in list(self._store.keys())[:overflow]:
                del self._store[k]

    def stats(self) -> dict:
        return {"tracked_fingerprints": len(self._store)}


# Singleton — shared across the detection pipeline
exact_dedup = ExactDedupFilter()
