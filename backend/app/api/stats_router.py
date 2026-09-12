from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
from app.db.database import get_db_connection

router = APIRouter()


def _parse_iso(value: str) -> datetime:
    """
    Parse an ISO 8601 string tolerantly.
    Handles both 'Z' suffix and '+00:00' offset.
    """
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    return datetime.fromisoformat(value)


def _seconds_for_range(time_range: str) -> int:
    """Return window size in seconds for named ranges."""
    return {
        "15m": 900,
        "1h":  3600,
        "6h":  21600,
        "24h": 86400,
        "7d":  604800,
        "30d": 2592000,
    }.get(time_range, 86400)


def _map_tech_to_tactic(tech: str) -> str:
    # A simple deterministic mapping for demonstration purposes
    # Maps specific common techniques to their primary tactics
    mapping = {
        "T1190": "TA0001", # Exploit Public Application -> Initial Access
        "T1059": "TA0002", # Command/Scripting Interp -> Execution
        "T1543": "TA0003", # Create/Mod System Process -> Persistence
        "T1078": "TA0004", # Valid Accounts -> PrivEsc
        "T1562": "TA0005", # Impair Defenses -> Defense Evasion
        "T1110": "TA0006", # Brute Force -> Credential Access
        "T1046": "TA0007", # Network Service Scanning -> Discovery
        "T1210": "TA0008", # Exploitation of Remote Services -> Lateral Movement
        "T1005": "TA0009", # Data from Local System -> Collection
        "T1071": "TA0011", # Application Layer Protocol -> Command and Control
        "T1048": "TA0010", # Exfiltration Over Alternative Protocol -> Exfiltration
        "T1485": "TA0040", # Data Destruction -> Impact
    }
    return mapping.get(tech, "TA0001") # Fallback to Initial Access for demo


@router.get("/stats/summary")
async def get_summary_stats(
    time_range: str = Query("24h"),
    start_time: Optional[str] = Query(None, description="ISO 8601 UTC start for custom range"),
    end_time:   Optional[str] = Query(None, description="ISO 8601 UTC end for custom range"),
):
    conn = get_db_connection()
    try:
        # ── Determine time bounds ──────────────────────────────────────────────
        if time_range == "custom" and start_time and end_time:
            try:
                dt_start = _parse_iso(start_time)
                dt_end   = _parse_iso(end_time)
            except ValueError as exc:
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid datetime format: {exc}. Use ISO 8601 e.g. 2026-05-09T10:00:00Z"
                )
            # Use absolute timestamps in query
            alert_time_filter    = "AND last_seen BETWEEN ? AND ?"
            alert_params         = (dt_start.isoformat(), dt_end.isoformat())
            telemetry_eps_filter = "WHERE timestamp BETWEEN ? AND ?"
            telemetry_eps_params = (dt_start.isoformat(), dt_end.isoformat())
            telemetry_hist_filter = "WHERE timestamp BETWEEN ? AND ?"
            telemetry_hist_params = (
                (dt_end - timedelta(minutes=10)).isoformat(),
                dt_end.isoformat(),
            )
        else:
            seconds = _seconds_for_range(time_range)
            alert_time_filter    = "AND (julianday('now') - julianday(last_seen)) * 86400 <= ?"
            alert_params         = (seconds,)
            telemetry_eps_filter = "WHERE timestamp > datetime('now', ?)"
            telemetry_eps_params = (f"-{seconds} seconds",)
            # Sparkline uses last 10 minutes regardless of range
            telemetry_hist_filter = "WHERE timestamp > datetime('now', '-10 minutes')"
            telemetry_hist_params = ()

        # ── Alert summary ─────────────────────────────────────────────────────
        alerts_open = conn.execute(
            f"SELECT COUNT(*) FROM alerts WHERE status = 'OPEN' {alert_time_filter}",
            alert_params,
        ).fetchone()[0]

        alerts_critical = conn.execute(
            f"SELECT COUNT(*) FROM alerts WHERE status = 'OPEN' AND severity = 'CRITICAL' {alert_time_filter}",
            alert_params,
        ).fetchone()[0]

        severity_rows = conn.execute(
            f"SELECT severity, COUNT(*) as count FROM alerts WHERE 1=1 {alert_time_filter} GROUP BY severity",
            alert_params,
        ).fetchall()
        severity_breakdown = {row["severity"]: row["count"] for row in severity_rows}

        # ── Investigations ────────────────────────────────────────────────────
        investigations_active = conn.execute(
            "SELECT COUNT(*) FROM investigations WHERE status != 'CLOSED'"
        ).fetchone()[0]

        # ── Assets ────────────────────────────────────────────────────────────
        assets_total = conn.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
        
        # ── Telemetry totals ────────────────────────────────────────────────────
        total_events = conn.execute("SELECT COUNT(*) FROM telemetry").fetchone()[0]
        events_today = conn.execute("SELECT COUNT(*) FROM telemetry WHERE timestamp > datetime('now', '-24 hours')").fetchone()[0]
        alerts_today = conn.execute("SELECT COUNT(*) FROM alerts WHERE last_seen > datetime('now', '-24 hours')").fetchone()[0]

        # ── MITRE Tactic Breakdown ────────────────────────────────────────────
        mitre_rows = conn.execute(f"""
            SELECT mitre_technique, COUNT(*) as count 
            FROM alerts 
            WHERE mitre_technique IS NOT NULL {alert_time_filter} 
            GROUP BY mitre_technique
        """, alert_params).fetchall()
        
        # Simple mapping for demo: Technique Txxxx -> Tactic TAxxxx
        # In a real SIEM, this is looked up from a matrix
        mitre_breakdown = {}
        for row in mitre_rows:
            tech = row['mitre_technique']
            # Mock mapping logic for the demo (normally TA0001 etc)
            # We'll just group them into generic tactics for the heatmap
            tactic = _map_tech_to_tactic(tech)
            mitre_breakdown[tactic] = mitre_breakdown.get(tactic, 0) + row['count']

        # ── Real EPS calculation ──────────────────────────────────────────────
        # EPS = events in last 60s / 60.0  (always from live telemetry tail)
        eps_count = conn.execute(
            "SELECT COUNT(*) FROM telemetry WHERE timestamp > datetime('now', '-60 seconds')"
        ).fetchone()[0]
        eps = round(eps_count / 60.0, 2)

        # ── EPS Sparkline (last 10 minutes, 1-minute buckets) ─────────────────
        eps_history_rows = conn.execute(f"""
            SELECT strftime('%H:%M', timestamp) AS minute, COUNT(*) AS count
            FROM telemetry
            {telemetry_hist_filter}
            GROUP BY minute
            ORDER BY minute ASC
        """, telemetry_hist_params).fetchall()
        eps_history = [
            {"time": r["minute"], "eps": round(r["count"] / 60.0, 2)}
            for r in eps_history_rows
        ]

        # ── Recent alerts (last 5) ────────────────────────────────────────────
        recent_alerts = conn.execute(
            f"SELECT * FROM alerts WHERE 1=1 {alert_time_filter} ORDER BY last_seen DESC LIMIT 5",
            alert_params,
        ).fetchall()

        return {
            "status": "success",
            "data": {
                "alerts": {
                    "open":      alerts_open,
                    "critical":  alerts_critical,
                    "alerts_today": alerts_today,
                    "breakdown": severity_breakdown,
                },
                "investigations": {
                    "active": investigations_active,
                },
                "assets": {
                    "total": assets_total,
                },
                "performance": {
                    "total_events": total_events,
                    "events_today": events_today,
                    "eps":         eps,
                    "ips":         round(eps * 1.05, 2),   # IPS ≈ EPS + small overhead
                    "eps_history": eps_history,
                },
                "recent_alerts": [dict(r) for r in recent_alerts],
                "mitre_breakdown": mitre_breakdown,
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        conn.close()
