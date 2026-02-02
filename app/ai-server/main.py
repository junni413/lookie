import os
import io
import json
import logging
import time
import httpx
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from ultralytics import YOLO
from PIL import Image, UnidentifiedImageError

# ==========================================
# 0. 로깅 설정 (터미널 출력용 포맷팅)
# ==========================================
# 시간, 레벨, 메시지를 깔끔하게 출력
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("AI_SERVER")

app = FastAPI()

# ==========================================
# 1. 설정 및 매핑 (Configuration)
# ==========================================

# [리뷰 반영 1] 환경변수 우선 적용
BACKEND_URL = os.getenv("BACKEND_URL", "http://host.docker.internal:8080")

# 문지기 모델 (공통)
gate_model = YOLO("model/yolov8n.onnx", task="detect")

# [리뷰 반영 2] 상품 ID 매핑 설정
PRODUCT_CONFIG = {
    46: {
        "target_name": "banana",
        "gate_class_id": 46,  # COCO Dataset: 46=banana
        "model_path": "model/best.onnx"
    },
}

# 모델 로드
DEFECT_MODELS = {}
for pid, config in PRODUCT_CONFIG.items():
    if os.path.exists(config["model_path"]):
        DEFECT_MODELS[pid] = YOLO(config["model_path"], task="detect")
        logger.info(f"✅ Model loaded for Product ID {pid}: {config['model_path']}")
    else:
        logger.warning(f"⚠️ Model file missing for Product ID {pid}: {config['model_path']}")

@app.get("/")
def health_check():
    return {"status": "ok", "env": BACKEND_URL}

# ==========================================
# 2. 핵심 로직 (로깅 & 예외 처리 강화)
# ==========================================
async def run_inference_and_send_webhook(image_bytes: bytes, product_id: int, issue_id: int):
    start_time = time.perf_counter()
    
    # ▶ [로그] 분석 시작
    logger.info(f"============ [Start Analysis] IssueID: {issue_id} / ProductID: {product_id} ============")

    # 기본 응답 포맷
    webhook_payload = {
        "issueId": issue_id,
        "aiDecision": "UNKNOWN",
        "confidence": 0.0,
        "summary": "",
        "aiResult": ""
    }
    
    detail_data = {"detections": [], "time_info": {}, "error_log": None}

    try:
        # -------------------------------------------------
        # (Step A) 이미지 로드 단계
        # -------------------------------------------------
        try:
            img = Image.open(io.BytesIO(image_bytes))
            img.verify()
            img = Image.open(io.BytesIO(image_bytes))
        except UnidentifiedImageError:
            raise ValueError("INVALID_IMAGE_FORMAT")
        except Exception as e:
            raise ValueError(f"IMAGE_LOAD_ERROR: {str(e)}")

        # -------------------------------------------------
        # (Step B) 상품 설정 확인
        # -------------------------------------------------
        if product_id not in PRODUCT_CONFIG:
            webhook_payload["aiDecision"] = "UNKNOWN"
            webhook_payload["summary"] = f"지원하지 않는 상품입니다. (ID: {product_id})"
            logger.warning(f"⚠️  Unsupported Product ID: {product_id}")
        
        elif product_id not in DEFECT_MODELS:
            webhook_payload["aiDecision"] = "UNKNOWN"
            webhook_payload["summary"] = "AI 모델 파일이 서버에 없습니다."
            logger.error(f"❌ Model not loaded for ID {product_id}")

        else:
            # 설정 가져오기
            config = PRODUCT_CONFIG[product_id]
            target_gate_class_id = config["gate_class_id"]
            target_model = DEFECT_MODELS[product_id]

            # -------------------------------------------------
            # (Step C) 문지기 추론 (Gatekeeper)
            # -------------------------------------------------
            t0 = time.perf_counter()
            gate_results = gate_model(img, verbose=False, conf=0.25)
            detail_data["time_info"]["gate"] = round(time.perf_counter() - t0, 4)

            is_gate_pass = False
            max_gate_conf = 0.0
            detected_names = [] # 로그용 이름 저장

            for res in gate_results:
                for box in res.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    name = gate_model.names[cls_id]
                    detected_names.append(f"{name}({conf:.2f})") # 이름+점수 로깅

                    if cls_id == target_gate_class_id:
                        is_gate_pass = True
                        max_gate_conf = max(max_gate_conf, conf)

            # ▶ [로그] 문지기 결과
            logger.info(f"🚪  Gatekeeper Result: {'PASS' if is_gate_pass else 'REJECT'}")
            logger.info(f"    └ Detected: {detected_names}")

            if not is_gate_pass:
                webhook_payload["aiDecision"] = "NEED_CHECK"
                webhook_payload["summary"] = f"상품 인식 실패. (감지됨: {detected_names})"
            
            else:
                # -------------------------------------------------
                # (Step D) 전문가 추론 (Defect Model)
                # -------------------------------------------------
                t1 = time.perf_counter()
                defect_results = target_model(img, conf=0.5)
                detail_data["time_info"]["defect"] = round(time.perf_counter() - t1, 4)

                max_defect_conf = 0.0
                defect_labels = []

                for res in defect_results:
                    for box in res.boxes:
                        conf = float(box.conf[0])
                        cls = int(box.cls[0])
                        # 커스텀 모델의 클래스 이름 안전하게 가져오기
                        label = target_model.names[cls] if hasattr(target_model, 'names') else "defect"
                        
                        max_defect_conf = max(max_defect_conf, conf)
                        defect_labels.append(f"{label}({conf:.2f})") # 로그용
                        
                        detail_data["detections"].append({
                            "label": label,
                            "confidence": round(conf, 2),
                            "bbox": box.xyxy[0].tolist()
                        })

                # ▶ [로그] 전문가 결과
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

    # [리뷰 반영 3] 예외 처리 세분화
    except ValueError as ve:
        logger.warning(f"⚠️ Validation Error: {ve}")
        webhook_payload["aiDecision"] = "UNKNOWN"
        webhook_payload["summary"] = str(ve)
    except Exception as e:
        logger.error(f"🔥 Critical Inference Error: {e}", exc_info=True)
        webhook_payload["aiDecision"] = "UNKNOWN"
        webhook_payload["summary"] = "AI Server Internal Error"
        detail_data["error_log"] = str(e)

    # -------------------------------------------------
    # (Step E) Webhook 전송
    # -------------------------------------------------
    total_time = round(time.perf_counter() - start_time, 4)
    detail_data["time_info"]["total"] = total_time
    webhook_payload["aiResult"] = json.dumps(detail_data, ensure_ascii=False)
    
    # ▶ [로그] 최종 요약
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