# =========================
# Frontend build stage (Vite)
# =========================
FROM node:24-alpine AS build
WORKDIR /app

# 의존성 먼저
COPY app/frontend/package*.json ./
RUN npm ci

# 소스 복사 후 빌드
COPY app/frontend/ .
RUN npm run build   # /app/dist 생성

# =========================
# Nginx serve stage
# =========================
FROM nginx:alpine

# 기본 설정 삭제 (있으면)
RUN rm -f /etc/nginx/conf.d/default.conf

# nginx 설정 복사 (경로 주의)
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf
COPY infra/nginx/conf.d /etc/nginx/conf.d

# 빌드 결과물(dist) 복사
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
