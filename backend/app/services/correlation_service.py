import json
import uuid
from datetime import datetime, timedelta
from app.db.database import get_db_connection
from app.websocket.server import manager

class CorrelationService:
    def process_alert(self, alert_id: int, alert_data: dict):
        """
        Correlates a new alert into a campaign based on source IP and timeframe.
        """
        source_ip = alert_data.get('source_ip')
        if not source_ip or source_ip == "0.0.0.0":
            return

        conn = get_db_connection()
        try:
            # Look for an active campaign for this IP in the last 4 hours
            campaign = conn.execute("""
                SELECT * FROM campaigns 
                WHERE source_ip = ? AND status = 'ACTIVE'
                AND (julianday('now') - julianday(last_seen)) * 24 <= 4
            """, (source_ip,)).fetchone()

            if campaign:
                self._update_campaign(conn, dict(campaign), alert_id, alert_data)
            else:
                self._create_campaign(conn, alert_id, alert_data)
        finally:
            conn.close()

    def _create_campaign(self, conn, alert_id: int, alert_data: dict):
        campaign_id = f"CMP-{uuid.uuid4().hex[:6].upper()}"
        title = f"Multi-Stage Attack from {alert_data['source_ip']}"
        
        # Initial risk score based on first alert
        risk_score = self._get_severity_score(alert_data['severity'])
        
        conn.execute("""
            INSERT INTO campaigns (id, title, status, risk_score, source_ip, mitre_tactics, alert_ids)
            VALUES (?, ?, 'ACTIVE', ?, ?, ?, ?)
        """, (
            campaign_id, 
            title, 
            risk_score, 
            alert_data['source_ip'],
            alert_data.get('mitre_tactic', 'Initial Access'),
            json.dumps([alert_id])
        ))
        
        # Link alert back to campaign
        conn.execute("UPDATE alerts SET campaign_id = ? WHERE id = ?", (campaign_id, alert_id))
        conn.commit()

        # Notify via WebSocket
        manager.broadcast_sync({
            "type": "campaign_created",
            "data": {
                "id": campaign_id,
                "title": title,
                "risk_score": risk_score,
                "source_ip": alert_data['source_ip']
            }
        })

    def _update_campaign(self, conn, campaign: dict, alert_id: int, alert_data: dict):
        # Update alert IDs
        alert_ids = json.loads(campaign['alert_ids'])
        if alert_id not in alert_ids:
            alert_ids.append(alert_id)
        
        # Increment risk score (capped at 100)
        new_score = min(100, campaign['risk_score'] + self._get_severity_score(alert_data['severity']))
        
        # Update tactics
        tactics = campaign['mitre_tactics'].split(',')
        new_tactic = alert_data.get('mitre_tactic')
        if new_tactic and new_tactic not in tactics:
            tactics.append(new_tactic)

        conn.execute("""
            UPDATE campaigns 
            SET risk_score = ?, mitre_tactics = ?, alert_ids = ?, last_seen = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            new_score,
            ",".join(tactics),
            json.dumps(alert_ids),
            campaign['id']
        ))
        
        # Link alert back to campaign
        conn.execute("UPDATE alerts SET campaign_id = ? WHERE id = ?", (campaign['id'], alert_id))
        conn.commit()

        # Notify via WebSocket
        manager.broadcast_sync({
            "type": "campaign_updated",
            "data": {
                "id": campaign['id'],
                "risk_score": new_score,
                "alert_count": len(alert_ids)
            }
        })

    def _get_severity_score(self, severity: str) -> int:
        scores = {
            'CRITICAL': 40,
            'HIGH': 25,
            'MEDIUM': 10,
            'LOW': 5,
            'info': 2
        }
        return scores.get(severity.upper(), 5)

correlation_service = CorrelationService()
