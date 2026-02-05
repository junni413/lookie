# 1. 파이썬 3.9 슬림
FROM python:3.10-slim

# 2. 작업 디렉토리
WORKDIR /app

# 3. 시스템 라이브러리 설치 (Debian 12 대응)
RUN apt-get update && apt-get install -y \
    libgl1 libglib2.0-0 libx11-6 libxext6 libxrender1 libxcb1 \
    && rm -rf /var/lib/apt/lists/*

# 4. CPU 전용 PyTorch 설치 (순서 중요: requirements보다 먼저)
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 5. 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. [NEW] 모델 파일 명시적 복사 (리뷰어 피드백 반영)
# 빌드 시점에 모델 파일이 없으면 여기서 에러가 나서 안전합니다.
# 문지기 모델 (Gatekeeper: Nano) - 필수
RUN mkdir -p /app/model
COPY model/yolov8n.onnx /app/model/yolov8n.onnx

# 전문가 모델 (Expert: Fine-tuned)
# 상품별로 학습된 모델 파일들을 복사합니다.
COPY model/best.onnx /app/model/best.onnx
# 추후 사과, 토마토 모델 추가 시 여기에 COPY 추가


# 7. 나머지 소스 코드 복사
# .dockerignore를 활용하면 더 좋지만, 일단 모델 외 코드 복사
COPY . .

# 8. 실행
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]