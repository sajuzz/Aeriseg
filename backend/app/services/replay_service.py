import asyncio
import uuid
import time
from typing import Dict, Any
from app.websocket.server import manager
from app.repositories.telemetry_repository import telemetry_repo
from app.detection.engine import detection_engine
import structlog

log = structlog.get_logger()

class ReplayJob:
    def __init__(self, job_id: str, total_events: int, speed: str):
        self.job_id = job_id
        self.total_events = total_events
        self.processed = 0
        self.speed = speed
        self.status = "Queued" # Queued, Running, Completed, Error
        self.start_time = time.time()
        self.end_time = None
        
    def to_dict(self):
        return {
            "job_id": self.job_id,
            "status": self.status,
            "total_events": self.total_events,
            "processed": self.processed,
            "speed": self.speed,
            "elapsed_sec": round((self.end_time or time.time()) - self.start_time, 2)
        }

class ReplayService:
    def __init__(self):
        self.jobs: Dict[str, ReplayJob] = {}

    def create_job(self, total_events: int, speed: str) -> str:
        job_id = str(uuid.uuid4())
        job = ReplayJob(job_id, total_events, speed)
        self.jobs[job_id] = job
        return job_id

    def get_job(self, job_id: str) -> dict:
        job = self.jobs.get(job_id)
        if not job:
            return None
        return job.to_dict()

    async def run_job(self, job_id: str, events: list):
        job = self.jobs.get(job_id)
        if not job:
            return
            
        job.status = "Running"
        job.start_time = time.time()
        log.info("replay_job_started", job_id=job_id, events=job.total_events, speed=job.speed)

        # Parse speed
        delay = 0
        if job.speed == "1x":
            delay = 1.0
        elif job.speed == "5x":
            delay = 0.2
        elif job.speed == "10x":
            delay = 0.1
        elif job.speed == "25x":
            delay = 0.04
        elif job.speed == "100x":
            delay = 0.01
            
        # For simplicity, if we have 150k events, we might batch them even in replay, 
        # but to simulate real-time, we'll process them in small batches
        batch_size = 50 if delay > 0 else 500
        
        try:
            for i in range(0, len(events), batch_size):
                batch = events[i:i+batch_size]
                
                # 1. Store
                event_ids = telemetry_repo.insert_many(batch)
                
                # Link event_ids to events
                for ev, eid in zip(batch, event_ids):
                    ev["event_id"] = eid
                    
                # 2. Detect & Aggregate & Correlate
                for ev in batch:
                    await detection_engine.process_log(ev)
                
                job.processed += len(batch)
                
                # Broadcast progress
                await manager.broadcast({
                    "type": "replay_progress",
                    "data": job.to_dict()
                })
                
                if delay > 0:
                    await asyncio.sleep(delay)
                    
            job.status = "Completed"
        except Exception as e:
            log.error("replay_job_failed", job_id=job_id, error=str(e))
            job.status = "Error"
            
        job.end_time = time.time()
        await manager.broadcast({
            "type": "replay_progress",
            "data": job.to_dict()
        })
        log.info("replay_job_completed", job_id=job_id)

replay_service = ReplayService()
