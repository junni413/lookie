import time  # [추가] 시간 측정을 위한 모듈
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from ultralytics import YOLO
from PIL import Image
import io

app = FastAPI()

# ==========================================
# 1. 모델 관리자 (Model Registry)
# ==========================================

gate_model = YOLO("model/yolov8n.onnx") 

DEFECT_MODELS = {
    # 46: YOLO("model/large_best.onnx", task="detect"),  
    46: YOLO("model/best.onnx", task="detect"), 
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
    
    # 시간 측정 결과 저장용 딕셔너리
    time_log = {
        "gate_inference": 0.0,
        "defect_inference": 0.0,
        "total_process": 0.0
    }

    # 1. 해당 상품의 불량 모델이 있는지 확인
    if product_id not in DEFECT_MODELS:
        return {
            "status": "error", 
            "message": f"지원하지 않는 상품 코드입니다. (ID: {product_id})",
            "time_info": {
                "total_process": round(time.perf_counter() - start_total_time, 4)
            }
        }
    
    target_model = DEFECT_MODELS[product_id] 

    # 2. 이미지 읽기
    image_bytes = await file.read()
    img = Image.open(io.BytesIO(image_bytes))

    # ==========================================
    # 3. 동적 문지기 (Dynamic Gatekeeper) 검사
    # ==========================================
    
    # [2] 문지기 모델 추론 시간 측정
    t0 = time.perf_counter()
    gate_results = gate_model(img, verbose=False)
    time_log["gate_inference"] = round(time.perf_counter() - t0, 4) # 초 단위 기록
    
    is_gate_pass = False
    detected_objects = []

    for res in gate_results:
        class_ids = res.boxes.cls.tolist()
        if float(product_id) in class_ids:
            is_gate_pass = True
        
        for cid in class_ids:
            detected_objects.append(gate_model.names[int(cid)])

    # ==========================================
    # 4. 전문가 추론 (Selected Model)
    # ==========================================
    
    # [3] 불량 탐지 모델 추론 시간 측정
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
            label = target_model.names[cls] if target_model.names else "defect"

            detections.append({
                "label": label,
                "confidence": round(conf, 2),
                "bbox": [round(x1), round(y1), round(x2), round(y2)]
            })

    is_defect_found = len(detections) > 0

    # ==========================================
    # 5. 최종 판정 및 응답 생성
    # ==========================================
    
    # [4] 전체 시간 계산 완료
    time_log["total_process"] = round(time.perf_counter() - start_total_time, 4)
    
    # [거절] 문지기도 못 찾고 & 불량 모델도 못 찾음
    if not is_gate_pass and not is_defect_found:
        return {
            "status": "reject",
            "message": f"요청하신 상품(ID: {product_id})이 탐지되지 않았습니다.\n다시 찍어주세요.",
            "detected_objects": list(set(detected_objects)),
            "filename": file.filename,
            "time_info": time_log  # 시간 정보 추가
        }

    # [성공]
    return {
        "status": "success",
        "product_id": product_id,
        "filename": file.filename, 
        "detections": detections,
        "time_info": time_log  # 시간 정보 추가
    }