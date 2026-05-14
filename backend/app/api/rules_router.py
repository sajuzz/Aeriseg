import os
import yaml
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
from app.core.auth import get_current_user, check_admin

router = APIRouter()
RULES_DIR = os.path.join(os.path.dirname(__file__), '../../detections')

@router.get("/rules")
async def get_rules(current_user: dict = Depends(get_current_user)):
    rules = []
    if not os.path.exists(RULES_DIR):
        return []
    for filename in os.listdir(RULES_DIR):
        if filename.endswith(('.yml', '.yaml')):
            with open(os.path.join(RULES_DIR, filename), 'r') as f:
                try:
                    rule = yaml.safe_load(f)
                    if rule:
                        rules.append({
                            "id": rule.get('id'),
                            "title": rule.get('title'),
                            "severity": rule.get('severity'),
                            "asql": rule.get('asql_query') or rule.get('mql_query'),
                            "enabled": rule.get('enabled'),
                            "_filename": filename
                        })
                except:
                    continue
    return {"status": "success", "data": rules}

@router.get("/rules/{filename}")
async def get_rule_content(filename: str, current_user: dict = Depends(get_current_user)):
    path = os.path.join(RULES_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Rule not found")
    with open(path, 'r') as f:
        return {"status": "success", "content": f.read()}

@router.post("/rules")
async def save_rule(rule_data: dict, current_user: dict = Depends(check_admin)):
    filename = rule_data.get('_filename')
    raw_content = rule_data.get('_raw')
    
    if not filename:
        filename = f"{rule_data.get('id', 'new_rule').lower().replace('-', '_')}.yaml"
    
    path = os.path.join(RULES_DIR, filename)
    
    if raw_content:
        # Save raw content directly (from the editor)
        with open(path, 'w') as f:
            f.write(raw_content)
    else:
        # Save structured data
        content_to_save = {k: v for k, v in rule_data.items() if not k.startswith('_')}
        with open(path, 'w') as f:
            yaml.dump(content_to_save, f, sort_keys=False)
    
    return {"status": "success", "message": f"Rule {filename} saved"}


@router.delete("/rules/{filename}")
async def delete_rule(filename: str, current_user: dict = Depends(check_admin)):
    path = os.path.join(RULES_DIR, filename)
    if os.path.exists(path):
        os.remove(path)
        return {"status": "success", "message": "Rule deleted"}
    raise HTTPException(status_code=404, detail="Rule not found")
