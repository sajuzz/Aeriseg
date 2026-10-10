from contextlib import asynccontextmanager
from fastapi import FastAPI
import structlog
import asyncio

from app.api import routers
from app.db.es import init_es, close_es
from app.services import nats_svc
from app.services.detection_service import detection_service
from app.providers.suricata_realtime import start_suricata_ingestor
from app.core.scheduler import detection_scheduler
from app.core.demo_manager import demo_manager

log = structlog.get_logger()

import os
import sys
import subprocess

@asynccontextmanager
async def lifespan(app: FastAPI):

    # Startup
    log.info("Starting up AeriSeg SIEM+SOAR")
    
    await init_es()
    
    # Run migrations
    try:
        # Use path relative to this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        mig_script = os.path.join(current_dir, "..", "migrations", "run_migrations.py")
        subprocess.run([sys.executable, mig_script], check=True)


        log.info("Migrations executed successfully")
        
        # Start Real-time Suricata Ingestion
        start_suricata_ingestor()
        log.info("Suricata real-time ingestor started")

        # Start Background Scheduler
        detection_scheduler.start()
        log.info("Background detection scheduler active")

        # Start Demo Manager
        demo_manager.start()
        log.info("Demo manager thread active")

    except Exception as e:
        log.error("Migration failed", error=str(e))
    
    # Start the mock telemetry generator in the background if enabled
    if os.environ.get("ENABLE_MOCKS", "false").lower() == "true":
        log.info("Mocks enabled: Starting telemetry loop")
        app.state.mock_task = asyncio.create_task(telemetry_loop())
    else:
        log.info("Mocks disabled: Waiting for real agent telemetry")
    
    # Start background detection scheduler
    async def run_detection_loop():
        log.info("Starting background detection scheduler")
        while True:
            try:
                # Run detections every 60 seconds
                result = await detection_service.run_detections()
                log.info("scheduler.detections_executed", result=result)
            except Exception as e:
                log.error("scheduler.detection_failed", error=str(e))
            await asyncio.sleep(60)

    app.state.detection_task = asyncio.create_task(run_detection_loop())
    
    # await ch_writer.start()

    # await nats_svc.connect_nats()
    yield
    # Shutdown
    log.info("Shutting down AeriSeg SIEM+SOAR")

    await close_es()
    
    if hasattr(app.state, 'mock_task'):
        app.state.mock_task.cancel()
    if hasattr(app.state, 'detection_task'):
        app.state.detection_task.cancel()


from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.websocket import server as ws_server
from app.api import query_router, ingest_router, investigation_router, asset_router, dashboard_router, stats_router, rules_router, agent_router, health_router, simulator_router, config_router, playbook_router
from app.identity import router as identity_router
from app.alerts import router as alerts_router
from app.incidents import router as incident_router
from app.industrial_intelligence import router as industrial_router


from app.mock.event_generator import telemetry_loop







app = FastAPI(title="AeriSeg SIEM+XDR", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routers.router, prefix="/api")
app.include_router(query_router.router, prefix="/api")
app.include_router(ingest_router.router, prefix="/api")
app.include_router(investigation_router.router, prefix="/api")
app.include_router(alerts_router.router, prefix="/api")
app.include_router(asset_router.router, prefix="/api")
app.include_router(dashboard_router.router, prefix="/api")
app.include_router(stats_router.router, prefix="/api")
app.include_router(identity_router.router, prefix="/api")
app.include_router(rules_router.router, prefix="/api")
app.include_router(agent_router.router, prefix="/api", tags=["Agents"])
app.include_router(health_router.router, prefix="/api", tags=["Health"])
app.include_router(simulator_router.router, prefix="/api", tags=["Simulator"])
app.include_router(config_router.router, prefix="/api", tags=["Configuration"])
app.include_router(incident_router.router, prefix="/api", tags=["Incidents"])
app.include_router(playbook_router.router, prefix="/api", tags=["Playbooks"])
app.include_router(industrial_router.router, prefix="/api")
app.include_router(ws_server.router)









# Mount static files to serve the React/HTML dashboard
import os
os.makedirs("app/static", exist_ok=True)
app.mount("/", StaticFiles(directory="app/static", html=True), name="static")

@app.get("/health")
async def health():
    return {"status": "ok"}
