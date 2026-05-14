from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Dict, Any


class DashboardWidget(BaseModel):
    id: Optional[int] = None
    dashboard_id: Optional[int] = None
    title: str
    widget_type: str          # stat, line, bar, pie, table
    mql_query: str
    visualization_config: Optional[Dict[str, Any]] = None
    position_x: int = 0
    position_y: int = 0
    width: int = 4
    height: int = 3
    refresh_interval: int = 60


class CustomDashboard(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    refresh_interval: int = 60
    layout_json: Optional[Dict[str, Any]] = None
    created_by: str = "local_analyst"
    created_at: Optional[datetime] = None
    widgets: List[DashboardWidget] = Field(default_factory=list)
