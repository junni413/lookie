# src/vision/router.py
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional
from src.vision.service import vision_service

# 라우터 정의 (/api/vision 접두사 사용)
router = APIRouter(prefix="/api/vision", tags=["Vision"])

# OOS 판단용 재고 상태 모델 (oos/router.py와 동일)
class InventoryState(BaseModel):
    availableQty: int = 0           # 가용 재고
    damagedTempQty: int = 0         # 파손 임시 처리 중
    scannedLocation: Optional[str] = None   # 작업자가 스캔한 위치
    expectedLocation: Optional[str] = None  # 시스템에 등록된 위치

class PredictRequest(BaseModel):
    imageUrl: Optional[str] = None  # DAMAGED: 필수, OUT_OF_STOCK: null 허용
    productId: int
    issueId: int
    issueType: Optional[str] = "DAMAGED"  # 기본값: DAMAGED
    inventoryState: Optional[InventoryState] = None  # OOS 판단용 재고 상태

@router.post("/predict")
async def predict(
    background_tasks: BackgroundTasks,
    request: PredictRequest
):
    """
    이미지 URL을 받아 백그라운드에서 추론하고 결과를 백엔드로 Webhook 전송
    """
    # 백그라운드 작업 등록 (Service 호출)
    background_tasks.add_task(
        vision_service.run_inference_from_url,
        request.imageUrl,
        request.productId,
        request.issueId,
        request.issueType,
        request.inventoryState.model_dump() if request.inventoryState else None
    )

    # 즉시 응답
    return {"status": "processing", "issue_id": request.issueId}