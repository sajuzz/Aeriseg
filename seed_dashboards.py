import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.models.dashboard import CustomDashboard, DashboardWidget
from app.services.dashboard_service import dashboard_service

def seed():
    print("Seeding default dashboards...")
    dash = CustomDashboard(
        name="Healthcare OT Overview",
        description="ICU & Medical Device Security Monitoring",
        widgets=[
            DashboardWidget(
                title="Critical Alerts",
                widget_type="stat",
                mql_query="severity:critical",
                width=3, height=3
            ),
            DashboardWidget(
                title="Alerts by Severity",
                widget_type="pie",
                mql_query="stats count() by severity",
                width=5, height=5
            ),
            DashboardWidget(
                title="Recent Critical Events",
                widget_type="table",
                mql_query="severity:critical | limit 10",
                width=8, height=4
            )
        ]
    )
    
    dashboard_id = dashboard_service.create_dashboard(dash)
    print(f"Created Dashboard ID: {dashboard_id}")

if __name__ == "__main__":
    seed()
