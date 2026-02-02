import os
import io
import json
import logging
import time
import httpx
from contextlib import asynccontextmanager  # [추가 1] Lifespan용
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks, Response, status # [추가 2] Response, status 추가
from ultralytics import YOLO
from PIL import Image, UnidentifiedImageError

# ==========================================
# 0. 로깅 설정
# ==========================================
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("AI_SERVER")

# ==========================================
# 1. 설정 및 전역 변수 (Configuration)
# ==========================================
BACKEND_URL = os.getenv("BACKEND_URL", "http://host.docker.internal:8080")

# 모델 및 상태 관리를 위한 전역 변수 선언
gate_model = None
DEFECT_MODELS = {}
model_loaded = False  # [핵심] 모델 로딩 상태 플래그

# 상품 설정 (Config)
PRODUCT_CONFIG = {
    46: {
        "target_name": "banana",
        "gate_class_id": 46,
        "model_path": "model/best.onnx"
    },
}

# ==========================================
# Lifespan: 서버 시작 시 모델 로딩 및 검증
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    global gate_model, DEFECT_MODELS, model_loaded
    
    logger.info("🔄 [Startup] Loading AI Models...")
    
    try:
        # 1. 문지기 모델 로드
        gate_model = YOLO("model/yolov8n.onnx", task="detect")
        logger.info("✅ Gatekeeper Model Loaded")

        # 2. 전문가 모델 로드
        success_count = 0
        for pid, config in PRODUCT_CONFIG.items():
            if os.path.exists(config["model_path"]):
                DEFECT_MODELS[pid] = YOLO(config["model_path"], task="detect")
                logger.info(f"✅ Defect Model Loaded: Product {pid}")
                success_count += 1
            else:
                logger.warning(f"⚠️ Model Missing: Product {pid} ({config['model_path']})")
        
        # [핵심 로직] 필수 모델(문지기)이 로드되었는지 확인
        if gate_model is not None:
            model_loaded = True
            logger.info(f"🚀 AI Server Ready! (Expert Models: {success_count})")
        else:
            logger.error("❌ Gatekeeper Model Load Failed!")
            model_loaded = False

    except Exception as e:
        logger.error(f"🔥 Critical Error during Model Loading: {e}")
        model_loaded = False
        
    yield  # 서버 실행 중...
    
    # 서버 종료 시 정리 (필요하면 추가)
    logger.info("🛑 [Shutdown] AI Server stopping...")
    gate_model = None
    DEFECT_MODELS.clear()

# FastAPI 앱 생성 (lifespan 연결)
app = FastAPI(lifespan=lifespan)


# ==========================================
# Health Check: 모델 상태 검증 포함
# ==========================================
@app.get("/health")
def health_check(response: Response):
    """
    서버 상태 및 모델 로딩 여부를 확인합니다.
    모델이 로딩되지 않았으면 503 에러를 반환합니다.
    """
    global model_loaded

    if model_loaded:
        return {
            "status": "ok", 
            "model_status": "loaded", 
            "env": BACKEND_URL
        }
    else:
        # 모델 로딩 실패 시 503 반환 -> Docker/K8s가 비정상 상태로 인지하고 재시작 유도 가능
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        logger.error("Health Check Failed: Models not loaded.")
        return {
            "status": "error", 
            "model_status": "not_loaded",
            "detail": "AI Models failed to initialize"
        }


# ==========================================
# 2. 핵심 로직 (Inference)
# ==========================================
async def run_inference_and_send_webhook(image_bytes: bytes, product_id: int, issue_id: int):
    # [방어 로직] 모델이 로드되지 않았으면 실행 불가
    if not model_loaded or gate_model is None:
        logger.error("❌ Inference blocked: Models are not loaded.")
        return

    start_time = time.perf_counter()
    
    logger.info(f"============ [Start Analysis] IssueID: {issue_id} / ProductID: {product_id} ============")

    webhook_payload = {
        "issueId": issue_id,
        "aiDecision": "UNKNOWN",
        "confidence": 0.0,
        "summary": "",
        "aiResult": ""
    }
    
    detail_data = {"detections": [], "time_info": {}, "error_log": None}

    try:
        # (Step A) 이미지 로드
        try:
            img = Image.open(io.BytesIO(image_bytes))
            img.verify()
            img = Image.open(io.BytesIO(image_bytes))
        except UnidentifiedImageError:
            raise ValueError("INVALID_IMAGE_FORMAT")
        except Exception as e:
            raise ValueError(f"IMAGE_LOAD_ERROR: {str(e)}")

        # (Step B) 상품 설정 확인
        if product_id not in PRODUCT_CONFIG:
            webhook_payload["aiDecision"] = "UNKNOWN"
            webhook_payload["summary"] = f"지원하지 않는 상품입니다. (ID: {product_id})"
            logger.warning(f"⚠️  Unsupported Product ID: {product_id}")
        
        elif product_id not in DEFECT_MODELS:
            webhook_payload["aiDecision"] = "UNKNOWN"
            webhook_payload["summary"] = "AI 모델 파일이 서버에 없습니다."
            logger.error(f"❌ Model not loaded for ID {product_id}")

        else:
            config = PRODUCT_CONFIG[product_id]
            target_gate_class_id = config["gate_class_id"]
            target_model = DEFECT_MODELS[product_id]

            # (Step C) 문지기 추론
            t0 = time.perf_counter()
            gate_results = gate_model(img, verbose=False, conf=0.25)
            detail_data["time_info"]["gate"] = round(time.perf_counter() - t0, 4)

            is_gate_pass = False
            max_gate_conf = 0.0
            detected_names = []

            for res in gate_results:
                for box in res.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    name = gate_model.names[cls_id]
                    detected_names.append(f"{name}({conf:.2f})")

                    if cls_id == target_gate_class_id:
                        is_gate_pass = True
                        max_gate_conf = max(max_gate_conf, conf)

            logger.info(f"🚪  Gatekeeper Result: {'PASS' if is_gate_pass else 'REJECT'}")
            logger.info(f"    └ Detected: {detected_names}")

            if not is_gate_pass:
                webhook_payload["aiDecision"] = "NEED_CHECK"
                webhook_payload["summary"] = f"상품 인식 실패. (감지됨: {detected_names})"
            
            else:
                # (Step D) 전문가 추론
                t1 = time.perf_counter()
                defect_results = target_model(img, conf=0.5)
                detail_data["time_info"]["defect"] = round(time.perf_counter() - t1, 4)

                max_defect_conf = 0.0
                defect_labels = []

                for res in defect_results:
                    for box in res.boxes:
                        conf = float(box.conf[0])
                        cls = int(box.cls[0])
                        label = target_model.names[cls] if hasattr(target_model, 'names') else "defect"
                        
                        max_defect_conf = max(max_defect_conf, conf)
                        defect_labels.append(f"{label}({conf:.2f})")
                        
                        detail_data["detections"].append({
                            "label": label,
                            "confidence": round(conf, 2),
                            "bbox": box.xyxy[0].tolist()
                        })

                if defect_labels:
                    logger.info(f"🔍  Expert Defect Found!: {defect_labels}")
                    webhook_payload["aiDecision"] = "FAIL"
                    webhook_payload["confidence"] = round(max_defect_conf, 2)
                    webhook_payload["summary"] = f"불량 검출: {', '.join(defect_labels)}"
                else:
                    logger.info(f"✅  Expert Clean: No defects found.")
                    webhook_payload["aiDecision"] = "PASS"
                    webhook_payload["confidence"] = round(max_gate_conf, 2)
                    webhook_payload["summary"] = "정상 상품입니다."

    except ValueError as ve:
        logger.warning(f"⚠️ Validation Error: {ve}")
        webhook_payload["aiDecision"] = "UNKNOWN"
        webhook_payload["summary"] = str(ve)
    except Exception as e:
        logger.error(f"🔥 Critical Inference Error: {e}", exc_info=True)
        webhook_payload["aiDecision"] = "UNKNOWN"
        webhook_payload["summary"] = "AI Server Internal Error"
        detail_data["error_log"] = str(e)

    # (Step E) Webhook 전송
    total_time = round(time.perf_counter() - start_time, 4)
    detail_data["time_info"]["total"] = total_time
    webhook_payload["aiResult"] = json.dumps(detail_data, ensure_ascii=False)
    
    logger.info(f"📊  [Final Decision]: {webhook_payload['aiDecision']} (Time: {total_time}s)")
    
    target_url = f"{BACKEND_URL}/api/issues/{issue_id}/ai/result"
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(target_url, json=webhook_payload, timeout=5.0)
            resp.raise_for_status()
            logger.info(f"🚀  Webhook Sent Success -> {target_url}")
        except httpx.HTTPStatusError as e:
            logger.error(f"❌  Webhook Status Error: {e.response.status_code} - {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"❌  Webhook Connection Error: {e}")
        except Exception as e:
            logger.error(f"❌  Webhook Unknown Error: {e}")

    logger.info("=================================================================\n")

@app.post("/predict")
async def predict(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    product_id: int = Form(...),
    issue_id: int = Form(...)
):
    try:
        image_bytes = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="File Read Error")
        
    background_tasks.add_task(
        run_inference_and_send_webhook, 
        image_bytes, 
        product_id, 
        issue_id
    )

    return {"status": "processing", "issue_id": issue_id}