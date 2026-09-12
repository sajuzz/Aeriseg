import os
import yaml
import structlog
import hashlib
import uuid
import time
from typing import List, Dict
from app.query.tokenizer import tokenize
from app.query.parser import parse_tokens
from app.query.compiler import compile_to_es
from app.movement_path.core import movement_path
from app.models.models import Alert, AlertStatus, Severity
from sqlalchemy.ext.asyncio import AsyncSession
# Assume we have a get_db_session function or we handle db session internally
# For this refactor, we'll keep the session dependency injection out of the signature 
# to match the existing scheduler pattern, and create sessions on the fly.
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

log = structlog.get_logger()

engine = create_async_engine(settings.DB_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

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

    async def run_detections(self):
        """Evaluates hybrid YAML rules against Elasticsearch via Movement Path."""
        alerts_generated = 0
        
        async with AsyncSessionLocal() as session:
            for rule in self.rules:
                try:
                    # In a real multi-tenant app, we'd run this per tenant.
                    # For MVP, assuming a default tenant for system rules.
                    tenant_id = "1" # Hardcoded default for migration, should be fetched from rule or system
                    matches = await self._evaluate_rule(rule, tenant_id)
                    for match in matches:
                        await self._generate_alert(session, rule, match, tenant_id)
                        alerts_generated += 1
                except Exception as e:
                    log.error("rule_evaluation_failed", rule_id=rule.get('id'), error=str(e))
            
            await session.commit()
            
        return {"status": "success", "alerts_generated": alerts_generated, "rules_evaluated": len(self.rules)}

    async def _evaluate_rule(self, rule: dict, tenant_id: str) -> List[Dict]:
        asql = rule.get('asql_query') or rule.get('mql_query')
        if not asql:
            return []
 
        # 1. Compile ASQL to ES DSL
        tokens = tokenize(asql)
        ast = parse_tokens(tokens)
        query_dsl = compile_to_es(ast)
        
        # 2. Add time window constraint
        window = rule.get('time_window_seconds', 300)
        time_filter = {
            "range": {
                "@timestamp": {
                    "gte": f"now-{window}s"
                }
            }
        }
        
        if "bool" not in query_dsl["query"]:
            query_dsl["query"] = {"bool": {"must": [query_dsl["query"]]}}
        if "filter" not in query_dsl["query"]["bool"]:
            query_dsl["query"]["bool"]["filter"] = []
            
        query_dsl["query"]["bool"]["filter"].append(time_filter)
        
        # 3. Execute against Movement Path
        query_dsl["size"] = 100 # limit matches
        query_dsl["sort"] = [{"@timestamp": {"order": "desc"}}]
        
        es_result = await movement_path.search(query_dsl, tenant_id)
        
        events = []
        if "hits" in es_result:
            for hit in es_result["hits"]["hits"]:
                events.append(hit["_source"])
        
        # 4. Handle Threshold
        threshold = rule.get('threshold', 1)
        if len(events) >= threshold:
            return [events[0]]
        
        return []

    async def _generate_alert(self, session: AsyncSession, rule: dict, trigger_event: dict, tenant_id: str):
        rule_id = rule['id']
        source_ip = trigger_event.get('source', {}).get('ip', 'unknown')
        
        # Map Severity enum
        severity_str = rule.get('severity', 'MEDIUM').upper()
        severity_enum = Severity.MEDIUM
        if hasattr(Severity, severity_str):
            severity_enum = getattr(Severity, severity_str)
            
        alert_id = str(uuid.uuid4())
        
        new_alert = Alert(
            id=alert_id,
            title=rule.get('title', 'Untitled Detection'),
            description=rule.get('description', ''),
            severity=severity_enum,
            status=AlertStatus.NEW,
            rule_id=rule_id,
            tenant_id=int(tenant_id),
            source_event_ids=[trigger_event.get('_id')]
        )
        
        session.add(new_alert)
        log.info("detection_engine.alert_generated", alert_id=alert_id, rule_id=rule_id)

detection_service = DetectionService()
