from apscheduler.schedulers.background import BackgroundScheduler
from app.repositories.telemetry_repository import telemetry_repo
from app.detection.engine import detection_engine
import structlog
import asyncio

log = structlog.get_logger()

class DetectionScheduler:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        
    def start(self):
        # Run batch detections every 60 seconds for missed events or multi-source correlation
        self.scheduler.add_job(self.run_batch_detections, 'interval', seconds=60)
        self.scheduler.add_job(self.check_agent_status, 'interval', seconds=60)
        self.scheduler.start()
        log.info("detection_scheduler_started")

    def run_batch_detections(self):
        """
        Fetches recent telemetry and re-evaluates rules.
        Useful for rules that require cross-source context over longer windows.
        """
        log.info("batch_detection_run_start")
        try:
            from app.db.database import get_db_connection
            recent_events = telemetry_repo.get_recent(minutes=2)
            if recent_events:
                # We need to run these asynchronously
                asyncio.run(detection_engine.process_batch(recent_events))
        except Exception as e:
            log.error("batch_detection_failed", error=str(e))

    def check_agent_status(self):
        """
        Marks agents OFFLINE if they haven't sent a heartbeat in 3 minutes.
        """
        from app.db.database import get_db_connection
        try:
            conn = get_db_connection()
            conn.execute("UPDATE agents SET status = 'OFFLINE' WHERE last_seen < datetime('now', '-3 minutes')")
            conn.commit()
            conn.close()
        except Exception as e:
            log.error("agent_status_check_failed", error=str(e))

detection_scheduler = DetectionScheduler()
