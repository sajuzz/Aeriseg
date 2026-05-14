from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
from datetime import datetime

class IngestEvent(BaseModel):
    source: str
    event_type: str
    raw_log: Dict[str, Any]

class CommonEventSchema(BaseModel):
    timestamp: str
    source: str
    event_type: str
    source_ip: str
    dest_ip: Optional[str] = None
    rule_name: Optional[str] = None
    raw_log: Dict[str, Any]
    severity: str = "info"

class ThreatHuntQuery(BaseModel):
    query: str = Field(..., max_length=2048)
    time_range: str = "24h"
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    page_size: int = Field(default=50, le=500)
    page: int = Field(default=1, ge=1)
    sort_by: str = Field(default="timestamp")
    explain: bool = Field(default=False)


class ThreatHuntResponse(BaseModel):
    events: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    stats: Dict[str, Any]

