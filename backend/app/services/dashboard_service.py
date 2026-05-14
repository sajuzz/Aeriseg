import json
import structlog
from typing import List, Dict, Any
from app.db.database import get_db_connection
from app.models.dashboard import CustomDashboard, DashboardWidget
# Using the hunt repository or similar to evaluate MQL queries
# Assuming we have a way to run MQL queries. For MVP we'll route it through a generic sql generation or hunt evaluation.
# We'll use get_db_connection for now to simulate MQL evaluation against the telemetry table.

log = structlog.get_logger()

class DashboardService:
    def create_dashboard(self, dashboard: CustomDashboard) -> int:
        conn = get_db_connection()
        try:
            cursor = conn.execute("""
                INSERT INTO custom_dashboards (name, description, refresh_interval, layout_json, created_by)
                VALUES (?, ?, ?, ?, ?)
            """, (
                dashboard.name, 
                dashboard.description, 
                dashboard.refresh_interval, 
                json.dumps(dashboard.layout_json) if dashboard.layout_json else None,
                dashboard.created_by
            ))
            dashboard_id = cursor.lastrowid
            
            # Add widgets
            for w in dashboard.widgets:
                self._add_widget_internal(conn, dashboard_id, w)
                
            conn.commit()
            return dashboard_id
        finally:
            conn.close()

    def _add_widget_internal(self, conn, dashboard_id: int, w: DashboardWidget):
        conn.execute("""
            INSERT INTO dashboard_widgets (
                dashboard_id, title, widget_type, mql_query, visualization_config, 
                position_x, position_y, width, height, refresh_interval
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            dashboard_id, w.title, w.widget_type, w.mql_query,
            json.dumps(w.visualization_config) if w.visualization_config else None,
            w.position_x, w.position_y, w.width, w.height, w.refresh_interval
        ))

    def get_dashboards(self) -> List[Dict]:
        conn = get_db_connection()
        try:
            rows = conn.execute("SELECT * FROM custom_dashboards ORDER BY created_at DESC").fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_dashboard_by_id(self, dash_id: int) -> Dict:
        conn = get_db_connection()
        try:
            dash = conn.execute("SELECT * FROM custom_dashboards WHERE id = ?", (dash_id,)).fetchone()
            if not dash:
                return None
                
            d_dict = dict(dash)
            if d_dict.get('layout_json'):
                d_dict['layout_json'] = json.loads(d_dict['layout_json'])
                
            # Get widgets
            widgets = conn.execute("SELECT * FROM dashboard_widgets WHERE dashboard_id = ?", (dash_id,)).fetchall()
            d_dict['widgets'] = []
            for w in widgets:
                w_dict = dict(w)
                if w_dict.get('visualization_config'):
                    w_dict['visualization_config'] = json.loads(w_dict['visualization_config'])
                d_dict['widgets'].append(w_dict)
                
            return d_dict
        finally:
            conn.close()

    def evaluate_widget(self, widget_id: int) -> Dict[str, Any]:
        """Evaluates a widget's MQL query and returns data formatted for the chart type."""
        conn = get_db_connection()
        try:
            widget = conn.execute("SELECT * FROM dashboard_widgets WHERE id = ?", (widget_id,)).fetchone()
            if not widget:
                return {"error": "Widget not found"}
                
            mql = widget['mql_query']
            w_type = widget['widget_type']
            
            # Simple mock evaluation of MQL -> SQL for MVP
            # Real implementation would use the actual MQL parser
            
            if w_type == 'stat':
                # e.g., MQL: severity:critical
                # We just return a count
                res = conn.execute("SELECT COUNT(*) as cnt FROM telemetry").fetchone()
                return {"value": res['cnt']}
                
            elif w_type == 'pie' or w_type == 'bar':
                # e.g., MQL: stats count() by department (would need join with assets)
                # Mock grouping by severity for demo purposes
                res = conn.execute("SELECT severity as label, COUNT(*) as value FROM telemetry GROUP BY severity").fetchall()
                return {"data": [dict(r) for r in res]}
                
            elif w_type == 'line':
                # Time series mock
                return {
                    "data": [
                        {"time": "10:00", "value": 12},
                        {"time": "10:15", "value": 45},
                        {"time": "10:30", "value": 32},
                        {"time": "10:45", "value": 67}
                    ]
                }
                
            elif w_type == 'table':
                res = conn.execute("SELECT timestamp, severity, source_ip, event_type FROM telemetry ORDER BY timestamp DESC LIMIT 10").fetchall()
                return {"data": [dict(r) for r in res]}
                
            return {"error": "Unsupported widget type"}
            
        finally:
            conn.close()

dashboard_service = DashboardService()
