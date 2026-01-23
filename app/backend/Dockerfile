# ================================
# 1단계: 빌드
# ================================
FROM gradle:8.5-jdk17 AS build

WORKDIR /app
COPY . .

# Spring Boot 실행 JAR 생성
RUN gradle clean bootJar


# ================================
# 2단계: 실행
# ================================
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 빌드된 jar 복사
COPY --from=build /app/build/libs/*.jar app.jar

# Spring 기본 포트
EXPOSE 8080

# 컨테이너 시작 시 Spring 실행
ENTRYPOINT ["java", "-jar", "app.jar"]
