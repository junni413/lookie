# 1. 파이썬 3.9 슬림
FROM python:3.9-slim

# 2. 작업 디렉토리
WORKDIR /app

# 3. [Debian 12 대응 수정] 시스템 라이브러리 설치
# libgl1-mesa-glx (구버전) -> libgl1 (신버전)으로 변경
# 줄바꿈(\) 없이 한 줄로 작성하여 복붙 에러 방지
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 libx11-6 libxext6 libxrender1 libxcb1 && rm -rf /var/lib/apt/lists/*

# 4. CPU 전용 PyTorch 설치
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 5. 나머지 라이브러리 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. 소스 및 실행
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]