from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from app.db.database import get_db_connection
from app.repositories.telemetry_repository import telemetry_repo


class CorrelationEngine:
    
    def _calculate_score(self, base: Dict, candidate: Dict) -> Tuple[int, List[str], Dict]:
        score = 0
        reasons = []
        matched = {}

        # Handle 'Z' and offset-naive vs offset-aware
        try:
            base_time = datetime.fromisoformat(base['timestamp'].replace('Z', '+00:00'))
            cand_time = datetime.fromisoformat(candidate['timestamp'].replace('Z', '+00:00'))
        except Exception:
            # Fallback if isoformat fails
            base_time = datetime.utcnow()
            cand_time = datetime.utcnow()

        time_diff = abs((base_time - cand_time).total_seconds() / 60)

        # Scoring Signals
        if base.get('source_ip') and base.get('source_ip') == candidate.get('source_ip') and base.get('source_ip') != "0.0.0.0":
            score += 50
            reasons.append("same_source_ip")
            matched['source_ip'] = base['source_ip']

        if base.get('host') and base.get('host') == candidate.get('host'):
            score += 30
            reasons.append("same_host")
            matched['host'] = base['host']

        if base.get('event_type') and base.get('event_type') == candidate.get('event_type'):
            score += 20
            reasons.append("same_event_type")

        # Time window bonuses
        if time_diff <= 5:
            score += 25
            reasons.append("within_5_minutes")
        elif time_diff <= 30:
            score += 10
            reasons.append("within_30_minutes")

        score = min(score, 100)
        return score, reasons, matched

    def get_correlations(self, event_id: str, min_score: int = 30, limit: int = 12) -> List[Dict]:
        base_event = telemetry_repo.get_event_by_id(event_id)
        if not base_event:
            return []

        conn = get_db_connection()
        try:
            # Fetch reasonable candidate pool (time window)
            # SQLite datetime() works with ISO strings
            sql = """
                SELECT * FROM telemetry 
                WHERE timestamp BETWEEN datetime(?, '-45 minutes') 
                AND datetime(?, '+45 minutes')
                AND event_id != ?
                ORDER BY timestamp DESC
                LIMIT 100
            """
            cursor = conn.cursor()
            cursor.execute(sql, (base_event['timestamp'], base_event['timestamp'], event_id))
            rows = cursor.fetchall()
            candidates = [dict(row) for row in rows]

            # Score and enrich
            scored_events = []
            for cand in candidates:
                score, reasons, matched = self._calculate_score(base_event, cand)
                
                if score >= min_score:
                    scored_events.append({
                        "event_id": cand["event_id"],
                        "timestamp": cand["timestamp"],
                        "severity": cand["severity"],
                        "source": cand["source"],
                        "source_ip": cand.get("source_ip"),
                        "event_type": cand.get("event_type"),
                        "score": score,
                        "reasons": reasons,
                        "matched_fields": matched
                    })

            # Sort by score descending
            scored_events.sort(key=lambda x: x["score"], reverse=True)
            return scored_events[:limit]

        finally:
            conn.close()

correlation_engine = CorrelationEngine()
