import time
import io
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from ultralytics import YOLO
from PIL import Image, UnidentifiedImageError

app = FastAPI()

# ==========================================
# 1. 모델 관리자 (Model Registry)
# ==========================================

# 문지기 모델 (Nano: 존재 여부 판단)
gate_model = YOLO("model/yolov8n.onnx", task="detect") 

# 전문가 모델 (Large/Best: 불량 판단)
DEFECT_MODELS = {
    46: YOLO("model/best.onnx", task="detect"), # 46: Banana
}

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Logistics AI Server is Running 📦"}

@app.post("/predict")
async def predict(
    file: UploadFile = File(...), 
    product_id: int = Form(...) 
):
    start_total_time = time.perf_counter()
    
    time_log = {
        "gate_inference": 0.0,
        "defect_inference": 0.0, # 실행 안 하면 0.0 유지
        "total_process": 0.0
    }

    # 1. 지원 상품 확인
    if product_id not in DEFECT_MODELS:
        return {
            "status": "error", 
            "message": f"지원하지 않는 상품 코드입니다. (ID: {product_id})",
            "code": "UNSUPPORTED_PRODUCT",
            "time_info": {"total_process": round(time.perf_counter() - start_total_time, 4)}
        }
    
    target_model = DEFECT_MODELS[product_id] 

    # 2. 이미지 읽기
    try:
        image_bytes = await file.read()
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        img = Image.open(io.BytesIO(image_bytes))
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="유효하지 않은 이미지 파일입니다.")

    # ==========================================
    # 3. [Step 1] 동적 문지기 (Gatekeeper)
    # ==========================================
    
    t0 = time.perf_counter()
    # conf=0.25: 노이즈 방지
    gate_results = gate_model(img, verbose=False, conf=0.25) 
    time_log["gate_inference"] = round(time.perf_counter() - t0, 4)
    
    is_gate_pass = False
    detected_objects = set()

    for res in gate_results:
        class_ids = res.boxes.cls.tolist()
        if float(product_id) in class_ids:
            is_gate_pass = True
        
        for cid in class_ids:
            if int(cid) in gate_model.names:
                detected_objects.add(gate_model.names[int(cid)])

    # 🚨 [Logic Change] 문지기 통과 실패 시 -> 즉시 거절 (Expert 실행 X)
    if not is_gate_pass:
        time_log["total_process"] = round(time.perf_counter() - start_total_time, 4)
        return {
            "status": "reject",
            "message": "상품이 명확하게 인식되지 않았습니다. 바르게 놓고 다시 촬영해주세요.",
            "code": "OBJECT_NOT_FOUND",
            "detected_objects": list(detected_objects),
            "time_info": time_log
        }

    # ==========================================
    # 4. [Step 2] 전문가 추론 (Expert) - 조건부 실행
    # ==========================================
    
    t1 = time.perf_counter()
    defect_results = target_model(img, conf=0.5) 
    time_log["defect_inference"] = round(time.perf_counter() - t1, 4)

    detections = []
    for result in defect_results:
        boxes = result.boxes
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            label = target_model.names[cls] if hasattr(target_model, 'names') else "defect"

            detections.append({
                "label": label,
                "confidence": round(conf, 2),
                "bbox": [round(x1), round(y1), round(x2), round(y2)]
            })

    # ==========================================
    # 5. 최종 응답
    # ==========================================
    
    time_log["total_process"] = round(time.perf_counter() - start_total_time, 4)
    
    return {
        "status": "success",
        "product_id": product_id,
        "detections": detections, # 빈 배열이면 정상, 있으면 불량
        "time_info": time_log
    }