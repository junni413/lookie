from fastapi import FastAPI, File, UploadFile
from ultralytics import YOLO
from PIL import Image
import io
import json

app = FastAPI()

# 1. 모델 로드 (서버 뜰 때 한 번만 로드)
# CPU 환경이므로 device='cpu' 명시
# model = YOLO("model/best.pt")
model = YOLO("model/best.onnx", task="detect")

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Banana AI Server is Running 🍌"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # 2. 이미지 읽기
    image_bytes = await file.read()
    img = Image.open(io.BytesIO(image_bytes))

    # 3. 추론 (Inference)
    # conf=0.5: 확신 50% 이상인 것만 잡기
    results = model(img, conf=0.5) 

    detections = []
    
    # 4. 결과 파싱 (JSON 변환)
    for result in results:
        boxes = result.boxes
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist() # 좌표
            conf = float(box.conf[0])             # 확신도
            cls = int(box.cls[0])                 # 클래스 ID
            label = model.names[cls]              # 클래스 이름 (banana_defect 등)

            detections.append({
                "label": label,
                "confidence": round(conf, 2),
                "bbox": [round(x1), round(y1), round(x2), round(y2)]
            })

    return {"filename": file.filename, "detections": detections}