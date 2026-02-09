# src/oos/router.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from src.oos.service import oos_service

router = APIRouter(prefix="/api/oos", tags=["OOS Investigator"])

# 🔥 새로운 모델: 백엔드에서 재고 상태를 직접 전달
class InventoryState(BaseModel):
    availableQty: int = 0           # 가용 재고
    damagedTempQty: int = 0         # 파손 임시 처리 중
    scannedLocation: Optional[str] = None   # 작업자가 스캔한 위치
    expectedLocation: Optional[str] = None  # 시스템에 등록된 위치

class OOSWithInventoryRequest(BaseModel):
    issueId: int
    productId: int
    inventoryState: InventoryState

# 🔥 새로운 엔드포인트: 백엔드가 재고 상태를 직접 전달
@router.post("/investigate-with-inventory")
async def investigate_with_inventory(
    background_tasks: BackgroundTasks,
    req: OOSWithInventoryRequest
):
    """
    재고 없음(OOS) 신고 시 AI가 원인을 분석합니다.
    백엔드에서 inventoryState를 직접 전달받아 처리합니다.
    결과는 Webhook으로 백엔드에 전송됩니다.
    """
    background_tasks.add_task(
        oos_service.investigate_with_inventory,
        req.issueId,
        req.productId,
        req.inventoryState.model_dump()
    )
    return {"status": "processing", "issue_id": req.issueId}