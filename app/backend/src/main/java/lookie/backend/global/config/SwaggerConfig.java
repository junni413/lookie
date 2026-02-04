package lookie.backend.global.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI (Swagger) 설정
 * - Swagger UI에 JWT Bearer 인증 버튼 추가
 * - 모든 API 요청에 Authorization 헤더 포함 가능
 */
@Configuration
public class SwaggerConfig { // 클래스 이름은 SwaggerConfig로 유지!

        private static final String SECURITY_SCHEME_NAME = "Bearer Authentication";

        @Bean
        public OpenAPI openAPI() {
                return new OpenAPI()
                                // API 정보 설정
                                .info(new Info()
                                                .title("Lookie API")
                                                .description("Lookie 백엔드 REST API 문서")
                                                .version("1.0.0"))

                                // JWT Bearer 인증 스키마 정의
                                .components(new Components()
                                                .addSecuritySchemes(SECURITY_SCHEME_NAME, new SecurityScheme()
                                                                .name(SECURITY_SCHEME_NAME)
                                                                .type(SecurityScheme.Type.HTTP)
                                                                .scheme("bearer")
                                                                .bearerFormat("JWT")
                                                                .in(SecurityScheme.In.HEADER)
                                                                .description("JWT 토큰을 입력하세요 (Bearer 접두사 제외)")))

                                // 모든 API에 보안 요구사항 적용 (Swagger UI 상단에 Authorize 버튼 표시)
                                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME));
        }
}