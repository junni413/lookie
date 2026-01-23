# ================================
# 1단계: 빌드
# ================================
FROM maven:3.9.6-eclipse-temurin-17 AS build

WORKDIR /app

# pom.xml 먼저 복사 (의존성 캐시 최적화)
COPY pom.xml .
RUN mvn -B dependency:go-offline

# 나머지 소스 복사
COPY . .

# Spring Boot JAR 빌드
RUN mvn clean package -DskipTests


# ================================
# 2단계: 실행
# ================================
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 빌드된 jar 복사
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
