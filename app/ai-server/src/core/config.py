# src/core/config.py
import os
from dotenv import load_dotenv

load_dotenv()

def get_required_env(key: str) -> str:
    value = os.getenv(key)
    if value is None:
        raise EnvironmentError(f"Missing required environment variable: {key}")
    return value

# 백엔드 주소
BACKEND_URL = os.getenv("BACKEND_URL", "http://host.docker.internal:8080")

# 상품별 모델 설정
PRODUCT_CONFIG = {
    46: {
        "target_name": "banana",
        "gate_class_id": 46,
        "model_path": "model/best.onnx"
    },
    # 테스트용: DB에 있는 상품들도 바나나 모델로 처리
    1000: {
        "target_name": "banana",
        "gate_class_id": 46,
        "model_path": "model/best.onnx"
    },
    1001: {
        "target_name": "banana",
        "gate_class_id": 46,
        "model_path": "model/best.onnx"
    },
    1002: {
        "target_name": "banana",
        "gate_class_id": 46,
        "model_path": "model/best.onnx"
    },
    1003: {
        "target_name": "banana",
        "gate_class_id": 46,
        "model_path": "model/best.onnx"
    },
    # 나중에 사과(47) 추가 시 여기에 작성
}

# 공통 모델 경로
GATE_MODEL_PATH = "model/yolov8n.onnx"

# [수정] GMS (SSAFY AI) 설정
# OpenAI 공식 키 대신 GMS 키를 사용
GMS_API_KEY = get_required_env("GMS_API_KEY") # 필수!
GMS_BASE_URL = get_required_env("GMS_BASE_URL") # 필수!

# 모델명도 변수로 빼두는 것이 좋습니다 (나중에 gpt-4o로 바꿀 때 편함)
GMS_MODEL_NAME = "gpt-4o-mini"

# SSRF 방어: 허용된 이미지 URL 도메인 목록
ALLOWED_IMAGE_DOMAINS = [
    "nginx",  # Docker 내부 Nginx 서버
    "localhost",  # 로컬 테스트용
    "127.0.0.1",  # 로컬 테스트용
    # 추가 허용 도메인이 필요하면 여기에 추가
]