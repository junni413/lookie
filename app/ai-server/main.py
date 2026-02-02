import time
import io
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from ultralytics import YOLO
from PIL import Image, UnidentifiedImageError

app = FastAPI()

# ==========================================
# 1. 모델 관리자 (Model Registry)
# ==========================================

# 문지기 모델 (가볍고 빠름, 존재 여부 판단)
# Dockerfile COPY 경로에 맞춰 수정 필요할 수 있음 (예: /app/model/...)
gate_model = YOLO("model/yolov8n.onnx", task="detect") 

# 전문가 모델 (무겁고 정확함, 불량 판단)
DEFECT_MODELS = {
    46: YOLO("model/best.onnx", task="detect"), # 46: Banana
    # 추후 확장: 47: YOLO("model/apple.onnx"),
}

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Logistics AI Server is Running 📦"}

@app.post("/predict")
async def predict(
    file: UploadFile = File(...), 
    product_id: int = Form(...) 
):
    # [1] 전체 처리 시간 측정 시작
    start_total_time = time.perf_counter()
    
    time_log = {
        "gate_inference": 0.0,
        "defect_inference": 0.0,
        "total_process": 0.0
    }

    # 1. 지원하는 상품인지 검증
    if product_id not in DEFECT_MODELS:
        return {
            "status": "error", 
            "message": f"지원하지 않는 상품 코드입니다. (ID: {product_id})",
            "code": "UNSUPPORTED_PRODUCT",
            "time_info": {"total_process": round(time.perf_counter() - start_total_time, 4)}
        }
    
    target_model = DEFECT_MODELS[product_id] 

    # 2. 이미지 읽기 및 유효성 검사 (추가된 부분)
    try:
        image_bytes = await file.read()
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()  # 이미지 파일이 깨졌는지 확인
        img = Image.open(io.BytesIO(image_bytes)) # verify 후에는 다시 open 해야 함
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="유효하지 않은 이미지 파일입니다.")

    # ==========================================
    # 3. 동적 문지기 (Dynamic Gatekeeper) 검사
    # ==========================================
    
    t0 = time.perf_counter()
    # conf=0.25: 너무 낮은 확률의 노이즈는 무시
    gate_results = gate_model(img, verbose=False, conf=0.25) 
    time_log["gate_inference"] = round(time.perf_counter() - t0, 4)
    
    is_gate_pass = False
    detected_objects = set() # 중복 제거를 위해 set 사용

    for res in gate_results:
        class_ids = res.boxes.cls.tolist()
        
        # 상품 ID(46)가 탐지 결과에 포함되어 있는지 확인
        if float(product_id) in class_ids:
            is_gate_pass = True
        
        for cid in class_ids:
            if int(cid) in gate_model.names:
                detected_objects.add(gate_model.names[int(cid)])

    # ==========================================
    # 4. 전문가 추론 (Selected Model)
    # ==========================================
    
    t1 = time.perf_counter()
    # 전문가 모델 실행
    defect_results = target_model(img, conf=0.5) 
    time_log["defect_inference"] = round(time.perf_counter() - t1, 4)

    detections = []
    for result in defect_results:
        boxes = result.boxes
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            # 모델에 names 정보가 없을 경우를 대비한 안전장치
            label = target_model.names[cls] if hasattr(target_model, 'names') else "defect"

            detections.append({
                "label": label,
                "confidence": round(conf, 2),
                "bbox": [round(x1), round(y1), round(x2), round(y2)]
            })

    is_defect_found = len(detections) > 0

    # ==========================================
    # 5. 최종 판정 및 응답 생성
    # ==========================================
    
    time_log["total_process"] = round(time.perf_counter() - start_total_time, 4)
    
    # [거절 Logic] 문지기도 못 찾고 & 불량 모델도 못 찾음 -> 재촬영 요청
    if not is_gate_pass and not is_defect_found:
        return {
            "status": "reject", # 프론트에서 이 상태값을 보고 재촬영 모달 띄움
            "message": "상품이 명확하게 인식되지 않았습니다. 바르게 놓고 다시 촬영해주세요.",
            "code": "OBJECT_NOT_FOUND",
            "detected_objects": list(detected_objects),
            "time_info": time_log
        }

    # [성공 Logic] 정상(Normal)이거나 불량(Defect)을 찾았거나
    return {
        "status": "success",
        "product_id": product_id,
        "detections": detections, # 빈 배열이면 '정상품', 있으면 '불량품'
        "time_info": time_log
    }