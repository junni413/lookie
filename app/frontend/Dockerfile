# =========================
# React 빌드 단계
# =========================

# Node 이미지 사용 (가볍고 안정적인 alpine)
FROM node:20-alpine AS build

# 컨테이너 내부 작업 디렉토리 지정
WORKDIR /app

# package.json / lock 파일만 먼저 복사
# → 의존성 캐시 최적화 (소스 수정 시 npm install 재실행 방지)
COPY package*.json ./
RUN npm install

# 나머지 소스 코드 복사
COPY . .

# Vite 빌드 실행
# → dist 폴더 생성
RUN npm run build



