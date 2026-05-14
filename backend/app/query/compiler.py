def compile_to_sql(ast: list) -> tuple:
    filters = []
    params = []
    valid_columns = ["source", "event_type", "source_ip", "severity", "timestamp", "alert_id", "rule_name"]
    
    for node in ast:
        if node["type"] == "key_value":
            k = node["key"]
            v = node["value"]
            if k in valid_columns:
                filters.append(f"LOWER({k}) = ?")
                params.append(v.lower())
            else:
                filters.append("LOWER(raw_log) LIKE ?")
                params.append(f"%{v.lower()}%")
        elif node["type"] == "general_term":
            filters.append("LOWER(raw_log) LIKE ?")
            params.append(f"%{node['value'].lower()}%")
            
    where_clause = " AND ".join(filters)
    return where_clause, tuple(params)
