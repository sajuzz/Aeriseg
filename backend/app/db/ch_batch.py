import asyncio
from typing import List, Dict, Any
import structlog
from app.db import ch

log = structlog.get_logger()

class ClickHouseBatchWriter:
    def __init__(self, batch_size: int = 200, flush_interval: float = 2.0):
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.queue: asyncio.Queue = asyncio.Queue()
        self.task: asyncio.Task | None = None
        self.stats = {"batches_sent": 0, "rows_sent": 0}

    async def start(self):
        self.task = asyncio.create_task(self._worker())
        log.info("ch_batch_writer_started")

    async def stop(self):
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        await self._flush()
        log.info("ch_batch_writer_stopped")

    async def put_alert(self, row: Dict[str, Any]):
        await self.queue.put(row)

    async def put_log(self, row: Dict[str, Any]):
        # Depending on how the detection engine writes raw logs
        await self.queue.put(row)

    async def _worker(self):
        while True:
            try:
                await asyncio.sleep(self.flush_interval)
                await self._flush()
            except asyncio.CancelledError:
                break
            except Exception as e:
                log.error("ch_batch_worker_error", error=str(e))

    async def _flush(self):
        batch = []
        while not self.queue.empty() and len(batch) < self.batch_size:
            try:
                batch.append(self.queue.get_nowait())
            except asyncio.QueueEmpty:
                break
                
        if not batch:
            return

        try:
            if hasattr(ch, 'insert_batch'):
                await ch.insert_batch(batch)
            self.stats["batches_sent"] += 1
            self.stats["rows_sent"] += len(batch)
            log.info("ch_batch_flushed", count=len(batch))
        except Exception as e:
            log.error("ch_batch_flush_failed", error=str(e), count=len(batch))
            # In a real system, you might want to requeue or write to DLQ

    def get_stats(self) -> Dict[str, Any]:
        return {
            "queue_size": self.queue.qsize(),
            "batches_sent": self.stats["batches_sent"],
            "rows_sent": self.stats["rows_sent"],
        }

ch_writer = ClickHouseBatchWriter()
