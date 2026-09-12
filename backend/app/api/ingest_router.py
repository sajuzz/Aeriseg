import io
import csv
import zipfile
import asyncio
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, List
from datetime import datetime, timezone
from app.movement_path.core import movement_path
from app.models.schema import IngestEvent
from app.parsers.registry import parser_registry
from app.websocket.server import manager
import structlog

log = structlog.get_logger()
router = APIRouter()

@router.get("/v1/ingest/sources")
async def get_data_sources():
    return {"status": "success", "data": parser_registry.get_all_sources()}

@router.post("/v1/ingest/events")
async def ingest_event(event: IngestEvent, tenant_id: str = "default_tenant"):
    # Real app would get tenant_id from auth dependency
    parser = parser_registry.get_parser(event.source)
    normalized = parser.parse(event.raw_log, event.event_type)
    
    await movement_path.ingest_event(normalized.model_dump(), event.source, tenant_id)
    await manager.broadcast({"type": "telemetry", "data": {"status": "ingested"}})

    return {"status": "success"}

@router.post("/v1/ingest/suricata")
async def ingest_suricata(raw_log: dict, tenant_id: str = "default_tenant"):
    await movement_path.ingest_event(raw_log, "suricata", tenant_id)
    return {"status": "success"}

@router.post("/v1/ingest/batch")
async def ingest_batch(events: List[IngestEvent], tenant_id: str = "default_tenant"):
    if len(events) > 500:
        raise HTTPException(status_code=413, detail="Batch size exceeds maximum of 500.")

    raw_batch = [e.raw_log for e in events]
    # For simplicity assuming homogeneous batch source
    source = events[0].source if events else "unknown"
    
    await movement_path.ingest_batch(raw_batch, source, tenant_id)
    
    await manager.broadcast({
        "type":  "telemetry_batch",
        "count": len(events),
    })

    return {"status": "success", "ingested": len(events)}

@router.post("/v1/ingest/zip")
async def ingest_zip(
    file: UploadFile = File(...),
    tenant_id: str = Form("default_tenant")
):
    """
    Securely ingests a ZIP file containing security logs.
    """
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only ZIP files are allowed.")
        
    content = await file.read()
    
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            total_size = 0
            file_count = 0
            for info in z.infolist():
                total_size += info.file_size
                file_count += 1
                if total_size > 100 * 1024 * 1024:
                    raise HTTPException(status_code=413, detail="ZIP archive too large when decompressed.")
                if file_count > 1000:
                    raise HTTPException(status_code=413, detail="Too many files in ZIP.")
                
                # Zip Slip protection
                if ".." in info.filename or info.filename.startswith("/"):
                    raise HTTPException(status_code=400, detail="Malicious ZIP structure detected.")
                    
            events_processed = 0
            for info in z.infolist():
                if info.is_dir(): continue
                if info.filename.endswith(".csv"):
                    with z.open(info) as f:
                        decoded = f.read().decode("utf-8-sig")
                        reader = csv.DictReader(io.StringIO(decoded))
                        batch = list(reader)
                        await movement_path.ingest_batch(batch, "csv", tenant_id)
                        events_processed += len(batch)
                        
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file.")
        
    return {"status": "success", "message": f"Processed {events_processed} events from ZIP."}
