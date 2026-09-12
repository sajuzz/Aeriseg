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

def compile_to_es(ast: list) -> dict:
    must_clauses = []
    
    for node in ast:
        if node["type"] == "key_value":
            k = node["key"]
            v = node["value"]
            if k == "source_ip":
                must_clauses.append({"term": {"source.ip": v}})
            elif k == "event_type":
                must_clauses.append({"term": {"event.action": v}})
            elif k == "severity":
                must_clauses.append({"term": {"event.severity": v.lower()}})
            else:
                must_clauses.append({"match": {k: v}})
        elif node["type"] == "general_term":
            must_clauses.append({"query_string": {"query": f"*{node['value']}*"}})
            
    query = {"bool": {"must": must_clauses}} if must_clauses else {"match_all": {}}
    return {"query": query}
