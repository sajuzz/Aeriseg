import os
import yaml
import structlog
import hashlib
from typing import List, Dict
from app.db.database import get_db_connection
from app.repositories.alert_repository import alert_repo
from app.query.tokenizer import tokenize
from app.query.parser import parse_tokens
from app.query.compiler import compile_to_sql

log = structlog.get_logger()

class DetectionService:
    def __init__(self):
        self.rules = self._load_rules()

    def _load_rules(self) -> List[Dict]:
        rules = []
        rules_dir = os.path.join(os.path.dirname(__file__), '../../detections')
        if os.path.exists(rules_dir):
            for filename in os.listdir(rules_dir):
                if filename.endswith(('.yml', '.yaml')):
                    with open(os.path.join(rules_dir, filename), 'r') as f:
                        try:
                            rule = yaml.safe_load(f)
                            if rule and rule.get('enabled', True):
                                rules.append(rule)
                        except Exception as e:
                            log.error("rule_load_error", file=filename, error=str(e))
        log.info("detection_engine.rules_loaded", count=len(rules))
        return rules

    def run_detections(self):
        """Evaluates hybrid YAML+ASQL rules against the datastore."""

        alerts_generated = 0
        conn = get_db_connection()
        try:
            for rule in self.rules:
                try:
                    matches = self._evaluate_rule(conn, rule)
                    for match in matches:
                        self._generate_alert(rule, match)
                        alerts_generated += 1
                except Exception as e:
                    log.error("rule_evaluation_failed", rule_id=rule.get('id'), error=str(e))
            
            return {"status": "success", "alerts_generated": alerts_generated, "rules_evaluated": len(self.rules)}
        finally:
            conn.close()

    def _evaluate_rule(self, conn, rule: dict) -> List[Dict]:
        asql = rule.get('asql_query') or rule.get('mql_query')
        if not asql:
            return []
 
        # 1. Compile ASQL to SQL
        tokens = tokenize(asql)
        ast = parse_tokens(tokens)
        where_clause, params = compile_to_sql(ast)
        
        # 2. Add time window constraint (sliding window)
        window = rule.get('time_window_seconds', 300)
        time_filter = "(julianday('now') - julianday(timestamp)) * 86400 <= ?"
        
        final_where = f"({where_clause}) AND {time_filter}" if where_clause else time_filter
        final_params = list(params) + [window]
        
        # 3. Execute
        query = f"SELECT * FROM telemetry WHERE {final_where} ORDER BY timestamp DESC"
        rows = conn.execute(query, tuple(final_params)).fetchall()
        events = [dict(r) for r in rows]
        
        # 4. Handle Threshold (Simple count-based threshold)
        threshold = rule.get('threshold', 1)
        if len(events) >= threshold:
            # For this MVP, we return the most recent event as the alert trigger
            return [events[0]]
        
        return []

    def _generate_alert(self, rule: dict, trigger_event: dict):
        rule_id = rule['id']
        source_ip = trigger_event.get('source_ip', 'unknown')
        host = trigger_event.get('host', 'unknown')
        
        # Deduplication key (hashes rule + source)
        key_str = f"{rule_id}:{source_ip}:{host}"
        dedup_key = hashlib.sha256(key_str.encode()).hexdigest()
        
        alert_data = {
            "rule_id": rule_id,
            "title": rule.get('title', 'Untitled Detection'),
            "severity": rule.get('severity', 'MEDIUM'),
            "source_event_id": trigger_event.get('event_id'),
            "source_ip": source_ip,
            "host": host,
            "dedup_key": dedup_key,
            "raw_payload": {
                "event": trigger_event,
                "rule_metadata": {
                    "description": rule.get('description'),
                    "mitre": rule.get('mitre', {}),
                    "category": rule.get('category')
                }
            }
        }
        
        alert_id = alert_repo.process_alert(alert_data)
        log.info("detection_engine.alert_processed", alert_id=alert_id, rule_id=rule_id)

detection_service = DetectionService()
