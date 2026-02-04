# main.py
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response, status
from src.vision.router import router as vision_router
from src.vision.service import vision_service

# 로깅 설정
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("AI_SERVER")

# Lifespan: 서버 시작/종료 시점 훅
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. 시작 시 모델 로드 (동기 함수지만 내부에서 client 생성)
    vision_service.load_models()
    yield
    # 2. 종료 시 정리 (★ await 추가 필수)
    await vision_service.unload_models()

# 앱 생성
app = FastAPI(lifespan=lifespan)

# 라우터 등록
app.include_router(vision_router)

# 백엔드 호환성을 위한 레거시 엔드포인트
from fastapi import BackgroundTasks
from src.vision.router import PredictRequest, predict

@app.post("/predict")
async def predict_legacy(
    background_tasks: BackgroundTasks,
    request: PredictRequest
):
    """
    레거시 엔드포인트 (백엔드 호환성)
    /api/vision/predict 사용 권장
    """
    # 라우터의 predict 함수 재사용
    return await predict(background_tasks, request)

# 헬스 체크
@app.get("/health")
def health_check(response: Response):
    if vision_service.is_loaded:
        return {"status": "ok", "model_status": "loaded"}
    else:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "error", "model_status": "not_loaded"}

@app.get("/")
def root():
    return {"message": "SF&S AI Server is Running 🍌"}