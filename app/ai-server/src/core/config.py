# src/core/config.py
import os

# 백엔드 주소
BACKEND_URL = os.getenv("BACKEND_URL", "http://host.docker.internal:8080")

# 상품별 모델 설정
PRODUCT_CONFIG = {
    46: {
        "target_name": "banana",
        "gate_class_id": 46,
        "model_path": "model/best.onnx"
    },
    # 나중에 사과(47) 추가 시 여기에 작성
}

# 공통 모델 경로
GATE_MODEL_PATH = "model/yolov8n.onnx"