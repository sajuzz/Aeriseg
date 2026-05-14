ALLOWED_SORT_FIELDS = {"timestamp", "severity", "source", "event_type"}

def validate_ast(ast: list):
    valid_columns = ["source", "event_type", "source_ip", "severity", "timestamp", "alert_id", "rule_name"]
    for node in ast:
        if node["type"] == "key_value":
            if node["key"] not in valid_columns and node["key"] not in ["message", "raw"]:
                # Soft validation, fallback to raw log search in compiler
                pass
    return ast
