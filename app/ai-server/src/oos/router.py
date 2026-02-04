# src/oos/router.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.oos.service import oos_service

router = APIRouter(prefix="/api/oos", tags=["OOS Investigator"])

class OOSRequest(BaseModel):
    item_id: int
    scanned_location: str

@router.post("/investigate")
def investigate_oos(req: OOSRequest):
    """
    재고 없음(OOS) 신고 시 AI가 원인을 분석해줍니다.
    """
    result = oos_service.investigate(req.item_id, req.scanned_location)
    return result