from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
from datetime import datetime

class IngestEvent(BaseModel):
    source: str
    event_type: str
    raw_log: Dict[str, Any]

class CommonEventSchema(BaseModel):
    event_id: Optional[str] = None
    timestamp: str
    source: str
    hostname: Optional[str] = None
    username: Optional[str] = None
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    event_type: str
    severity: str = "INFO"
    raw_log: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    rule_name: Optional[str] = None

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

