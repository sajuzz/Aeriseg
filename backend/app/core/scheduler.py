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
        self.scheduler.start()
        log.info("detection_scheduler_started")

    def run_batch_detections(self):
        """
        Fetches recent telemetry and re-evaluates rules.
        Useful for rules that require cross-source context over longer windows.
        """
        log.info("batch_detection_run_start")
        try:
            # Fetch last 2 minutes of telemetry
            recent_events = telemetry_repo.get_recent(minutes=2)
            
            # Since detection_engine.process_log is async, we need a runner
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            for event in recent_events:
                loop.run_until_complete(detection_engine.process_log(event))
                
            loop.close()
            log.info("batch_detection_run_complete", events_processed=len(recent_events))
        except Exception as e:
            log.error("batch_detection_failed", error=str(e))

detection_scheduler = DetectionScheduler()
