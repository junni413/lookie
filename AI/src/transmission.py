from ultralytics import YOLO

# 1. 학습된 모델 불러오기
model = YOLO("../models/v3/epoch=300,patient=100/best.pt")

# 2. ONNX로 내보내기 (이 파일이 생성됩니다: best.onnx)
# cpu 전용 최적화를 위해 dynamic=False (이미지 크기 고정) 권장
model.export(format="onnx", imgsz=640)