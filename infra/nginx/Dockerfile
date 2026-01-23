# ================================
# Nginx Reverse Proxy Container
# ================================

FROM nginx:alpine

# 기본 설정 삭제
RUN rm /etc/nginx/conf.d/default.conf

# 전역 설정 복사
COPY nginx.conf /etc/nginx/nginx.conf

# 서버 설정 복사
COPY conf.d /etc/nginx/conf.d

# 외부 노출 포트
EXPOSE 80

# nginx 실행
CMD ["nginx", "-g", "daemon off;"]
