import time
import io
import json # [NEW] 상세 결과를 문자열로 변환하기 위해 필요
import httpx
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from ultralytics import YOLO
from PIL import Image

app = FastAPI()

# ==========================================
# 0. 설정
# ==========================================
BACKEND_URL = "http://host.docker.internal:8080" # 환경에 맞게 수정

# ==========================================
# 1. 모델 로드
# ==========================================
gate_model = YOLO("model/yolov8n.onnx", task="detect") 
DEFECT_MODELS = {
    46: YOLO("model/best.onnx", task="detect"), 
}

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Logistics AI Server Running"}

# ==========================================
# 2. 핵심 로직 (DTO 매핑 포함)
# ==========================================
async def run_inference_and_send_webhook(image_bytes: bytes, product_id: int, issue_id: int):
    start_total_time = time.perf_counter()
    
    # -------------------------------------------------
    # [1] 상세 분석 데이터 생성 (기존 로직)
    # -------------------------------------------------
    detail_data = {
        "detections": [],
        "time_info": {},
        "raw_gate_result": None
    }
    
    # Java DTO에 매핑될 변수들 초기화
    decision = "UNKNOWN"   # PASS, FAIL, NEED_CHECK, UNKNOWN
    confidence = 0.0
    summary = ""

    try:
        img = Image.open(io.BytesIO(image_bytes))

        # (A) 지원하지 않는 상품
        if product_id not in DEFECT_MODELS:
            decision = "UNKNOWN"
            summary = f"지원하지 않는 상품 코드입니다. (ID: {product_id})"
        
        else:
            target_model = DEFECT_MODELS[product_id]
            
            # (B) 문지기 (Gatekeeper)
            t0 = time.perf_counter()
            gate_results = gate_model(img, verbose=False, conf=0.25)
            detail_data["time_info"]["gate"] = round(time.perf_counter() - t0, 4)
            
            is_gate_pass = False
            detected_objs = []
            
            # 문지기 신뢰도 중 가장 높은 값 찾기 (정상 판정 시 사용)
            max_gate_conf = 0.0 

            for res in gate_results:
                for box in res.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    name = gate_model.names[cls_id]
                    detected_objs.append(name)
                    
                    if cls_id == int(product_id): # ID 일치 확인 (YOLO class ID와 product_id 매핑 가정)
                        is_gate_pass = True
                        max_gate_conf = max(max_gate_conf, conf)
                    elif float(product_id) == float(cls_id): # 혹은 class ID가 숫자 그대로 매핑되는 경우
                        is_gate_pass = True
                        max_gate_conf = max(max_gate_conf, conf)

            detail_data["raw_gate_result"] = detected_objs

            if not is_gate_pass:
                # (C) 문지기 탈락 -> 재촬영 필요
                decision = "NEED_CHECK"
                summary = f"상품 인식 실패. 감지됨: {detected_objs}"
                confidence = 0.0
            else:
                # (D) 전문가 모델 (Expert)
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
                        defect_labels.append(label)
                        
                        detail_data["detections"].append({
                            "label": label,
                            "confidence": round(conf, 2),
                            "bbox": box.xyxy[0].tolist()
                        })

                # (E) 최종 판정
                if len(defect_labels) > 0:
                    decision = "FAIL" # 불량 발견
                    confidence = max_defect_conf # 불량일 확률
                    summary = f"불량 검출됨: {', '.join(defect_labels)}"
                else:
                    decision = "PASS" # 정상
                    confidence = max_gate_conf # 이게 바나나일 확률
                    summary = "정상 상품입니다."

    except Exception as e:
        print(f"Error: {e}")
        decision = "UNKNOWN"
        summary = f"System Error: {str(e)}"

    # 전체 시간 기록
    detail_data["time_info"]["total"] = round(time.perf_counter() - start_total_time, 4)

    # -------------------------------------------------
    # [2] Java DTO 포맷으로 변환 (Webhook Payload)
    # -------------------------------------------------
    webhook_payload = {
        "aiDecision": decision,       # String
        "confidence": confidence,     # Float
        "summary": summary,           # String
        "aiResult": json.dumps(detail_data, ensure_ascii=False) # String (JSON을 문자열로)
    }

    # -------------------------------------------------
    # [3] 전송
    # -------------------------------------------------
    target_url = f"{BACKEND_URL}/api/issues/{issue_id}/ai/result"
    print(f"🚀 Sending to Backend: {target_url}")
    print(f"📦 Data: {webhook_payload}")

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(target_url, json=webhook_payload)
            resp.raise_for_status()
            print("✅ Webhook Sent Successfully")
        except Exception as e:
            print(f"❌ Webhook Failed: {e}")

@app.post("/predict")
async def predict(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    product_id: int = Form(...),
    issue_id: int = Form(...)
):
    image_bytes = await file.read()
    
    # 백그라운드 실행
    background_tasks.add_task(
        run_inference_and_send_webhook, 
        image_bytes, 
        product_id, 
        issue_id
    )

    return {"status": "processing", "issue_id": issue_id}