from fastapi import APIRouter, HTTPException, UploadFile, File
from app.services.asset_service import asset_service

router = APIRouter()

@router.get("/assets")
async def get_assets():
    try:
        return {"status": "success", "data": asset_service.get_assets()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assets/upload")
async def upload_assets(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are currently supported")
    try:
        content = await file.read()
        result = asset_service.process_csv_upload(content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/assets/enrich/{ip}")
async def enrich_asset(ip: str):
    try:
        asset = asset_service.get_asset_by_ip(ip)
        if not asset:
            return {"status": "not_found", "data": None}
        return {"status": "success", "data": asset}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
