# src/vision/router.py
from fastapi import APIRouter, File, UploadFile, Form, BackgroundTasks, HTTPException
from src.vision.service import vision_service

# 라우터 정의 (/api/vision 접두사 사용)
router = APIRouter(prefix="/api/vision", tags=["Vision"])

@router.post("/predict")
async def predict(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    product_id: int = Form(...),
    issue_id: int = Form(...)
):
    """
    이미지를 받아 백그라운드에서 추론하고 결과를 백엔드로 Webhook 전송
    """
    # 1. 파일 읽기
    try:
        image_bytes = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="File Read Error")
        
    # 2. 백그라운드 작업 등록 (Service 호출)
    background_tasks.add_task(
        vision_service.run_inference, 
        image_bytes, 
        product_id, 
        issue_id
    )

    # 3. 즉시 응답
    return {"status": "processing", "issue_id": issue_id}