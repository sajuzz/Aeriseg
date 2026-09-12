from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from app.core.auth import get_current_user
from app.models.models import Playbook, PlaybookStatus
from app.services.detection_service import AsyncSessionLocal
from sqlalchemy.future import select
import uuid

router = APIRouter()

@router.post("/playbooks")
async def save_playbook(playbook_def: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    tenant_id = current_user.get("tenant_id", 1)
    
    # Strict JSON Validation MVP
    if not isinstance(playbook_def, dict) or "nodes" not in playbook_def:
        raise HTTPException(status_code=400, detail="Invalid playbook format. Must contain 'nodes'.")
        
    async with AsyncSessionLocal() as session:
        playbook_id = playbook_def.get("id")
        
        if playbook_id:
            # Update existing
            stmt = select(Playbook).where(Playbook.id == playbook_id, Playbook.tenant_id == tenant_id)
            result = await session.execute(stmt)
            pb = result.scalar_one_or_none()
            if pb:
                pb.definition = playbook_def
                pb.name = playbook_def.get("name", "Untitled Playbook")
                await session.commit()
                return {"status": "success", "id": pb.id}
        
        new_id = f"PB-{uuid.uuid4().hex[:8].upper()}"
        new_pb = Playbook(
            id=new_id,
            name=playbook_def.get("name", "Untitled Playbook"),
            definition=playbook_def,
            status=PlaybookStatus.DRAFT,
            trigger_type="manual",
            tenant_id=tenant_id
        )
        session.add(new_pb)
        await session.commit()
        return {"status": "success", "id": new_id}

@router.post("/playbooks/{playbook_id}/test")
async def test_playbook(playbook_id: str, trigger_data: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    tenant_id = current_user.get("tenant_id", 1)
    
    async with AsyncSessionLocal() as session:
        stmt = select(Playbook).where(Playbook.id == playbook_id, Playbook.tenant_id == tenant_id)
        result = await session.execute(stmt)
        pb = result.scalar_one_or_none()
        
        if not pb:
            raise HTTPException(status_code=404, detail="Playbook not found")
            
        from app.soar.engine import playbook_engine
        exec_id = await playbook_engine.execute_playbook(
            session=session,
            playbook=pb,
            trigger_entity_type="test",
            trigger_entity_id="test_trigger",
            tenant_id=tenant_id
        )
        return {"status": "success", "execution_id": exec_id}
