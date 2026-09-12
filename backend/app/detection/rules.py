import re
import os
import yaml
import structlog

log = structlog.get_logger()

# The unified path to the YAML detection rules
RULES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "detection-rules"))

def load_yaml_rules():
    """Dynamically parses YAML rules into the engine format."""
    rules_list = []
    
    if not os.path.exists(RULES_DIR):
        log.warning("rules_dir_not_found", path=RULES_DIR)
        return rules_list
        
    for filename in os.listdir(RULES_DIR):
        if filename.endswith((".yml", ".yaml")):
            path = os.path.join(RULES_DIR, filename)
            try:
                with open(path, "r") as f:
                    rule = yaml.safe_load(f)
                    
                if not rule or not isinstance(rule, dict) or not rule.get('enabled', True):
                    continue
                    
                # Compile regex if present
                if "regex" in rule and isinstance(rule["regex"], str):
                    rule["regex"] = re.compile(rule["regex"], re.IGNORECASE)
                    
                rules_list.append(rule)
            except Exception as e:
                log.error("rule_load_failed", file=filename, error=str(e))
                
    return rules_list

def load_db_rules():
    """Load rules from detection_rules table."""
    import json
    from app.repositories.rules_repository import rules_repository
    rules_list = []
    
    try:
        db_rules = rules_repository.get_all_rules()
        for r in db_rules:
            if not r["enabled"]:
                continue
                
            rule = {
                "id": r["id"],
                "name": r["name"],
                "title": r["name"],
                "description": r["description"],
                "severity": r["severity"],
                "tactic": r["mitre_tactic"],
                "mitre_technique": r["mitre_technique"],
                "correlation": {
                    "correlate_by": ["source_ip"],
                    "correlation_window_secs": r["window_secs"] or 300,
                    "threshold": r["threshold"] or 1
                }
            }
            
            try:
                query = json.loads(r["query_json"])
                rule["match"] = query
            except json.JSONDecodeError:
                pass
                
            rules_list.append(rule)
    except Exception as e:
        log.error("db_rules_load_failed", error=str(e))
        
    return rules_list

def load_all_rules():
    return load_yaml_rules() + load_db_rules()

# Initialize with current rules on boot
DETECTION_RULES = load_all_rules()
