"""
AeriSeg — Bucket Reaper

Background task: closes correlation buckets whose window has fully
elapsed with no new events, persisting final state to SQLite and
freeing the in-memory slot.

Wire into app startup:

    from app.detection.reaper import reaper
    reaper_task = asyncio.create_task(reaper.run_forever())

    # on shutdown:
    reaper.stop()
    reaper_task.cancel()
"""
from __future__ import annotations

import asyncio
from datetime import datetime

import structlog

from app.detection.bucket_store import BucketStore, bucket_store

log = structlog.get_logger()


class BucketReaper:
    def __init__(self, store: BucketStore = bucket_store, interval_secs: float = 30.0):
        self._store = store
        self._interval = interval_secs
        self._running = False

    async def run_forever(self) -> None:
        self._running = True
        log.info("bucket_reaper_started", interval_secs=self._interval)
        while self._running:
            try:
                await self._sweep()
            except Exception as e:
                log.error("bucket_reaper_error", error=str(e))
            await asyncio.sleep(self._interval)

    def stop(self) -> None:
        self._running = False

    async def _sweep(self) -> None:
        now = datetime.utcnow()
        buckets = await self._store.all_open()
        closed = 0
        for bucket in buckets:
            if now > bucket.window_expires_at and now > bucket.suppression_expires_at:
                await self._store.close_and_evict(bucket.key)
                closed += 1
        if closed:
            log.info("bucket_reaper_swept", closed=closed)


# Singleton
reaper = BucketReaper()
