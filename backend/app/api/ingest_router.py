from fastapi import APIRouter, HTTPException
from app.models.schema import IngestEvent
from app.parsers.registry import parser_registry
from app.repositories.telemetry_repository import telemetry_repo
from app.websocket.server import manager
from app.detection.engine import detection_engine
import structlog
import asyncio
from typing import List

log = structlog.get_logger()
router = APIRouter()

@router.get("/v1/ingest/sources")
async def get_data_sources():
    """Returns the list of active and planned telemetry sources."""
    return {"status": "success", "data": parser_registry.get_all_sources()}

@router.post("/v1/ingest/events")
async def ingest_event(event: IngestEvent):
    """Ingest a single event using the appropriate parser."""
    # 1. Select Parser and Normalize
    parser = parser_registry.get_parser(event.source)
    normalized = parser.parse(event.raw_log, event.event_type)
    event_dict = normalized.model_dump()

    # 2. Store to SQLite
    event_id = telemetry_repo.insert(event_dict)
    event_dict["event_id"] = event_id

    # 3. Broadcast Telemetry to UI
    await manager.broadcast({"type": "telemetry", "data": event_dict})

    # 4. Process Detection Rules (async)
    asyncio.create_task(detection_engine.process_log(event_dict))

    return {"status": "success", "event_id": event_id}

@router.post("/v1/ingest/batch")
async def ingest_batch(events: List[IngestEvent]):
    """Bulk ingest endpoint with modular parser support."""
    if len(events) > 500:
        raise HTTPException(
            status_code=413,
            detail="Batch size exceeds maximum of 500 events per request.",
        )

    results = []
    for event in events:
        parser = parser_registry.get_parser(event.source)
        normalized = parser.parse(event.raw_log, event.event_type)
        event_dict = normalized.model_dump()

        event_id = telemetry_repo.insert(event_dict)
        event_dict["event_id"] = event_id

        results.append(event_id)
        asyncio.create_task(detection_engine.process_log(event_dict))

    await manager.broadcast({
        "type":  "telemetry_batch",
        "count": len(results),
    })

    log.info("batch.ingest_complete", count=len(results))
    return {"status": "success", "ingested": len(results), "event_ids": results}
