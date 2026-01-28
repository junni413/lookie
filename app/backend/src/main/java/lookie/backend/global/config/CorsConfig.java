package lookie.backend.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * [CORS(Cross-Origin Resource Sharing) 설정 파일]
 * - 프론트엔드(다른 도메인)에서 백엔드 API로 요청을 보낼 때 발생하는 브라우저 보안 이슈를 해결합니다.
 * - SecurityConfig에서 분리하여 CORS 정책만 독립적으로 관리합니다.
 */
@Configuration
public class CorsConfig {

    // application.properties에서 허용할 도메인 목록을 가져옵니다.
    // 예: http://localhost:3000,https://mydomain.com
    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // 1. 허용할 오리진(도메인) 설정
        // - 설정 파일(application.properties)의 값을 쉼표(,)로 구분하여 리스트로 변환
        // - allowCredentials(true)를 사용할 경우, "*" 대신 구체적인 패턴을 명시해야 함
        config.setAllowedOriginPatterns(Arrays.asList(allowedOrigins.split(",")));

        // 2. 허용할 HTTP 메서드 설정
        // - 기본적인 CRUD 동작을 위한 모든 메서드 허용
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

        // 3. 허용할 헤더 설정
        // - Authorization 등 모든 헤더 허용
        config.setAllowedHeaders(List.of("*"));

        // 4. 자격 증명(Credentials) 허용 설정
        // - 쿠키, Authorization 헤더 등을 포함한 요청을 허용하려면 true로 설정해야 함
        config.setAllowCredentials(true);

        // 5. 위 설정을 적용할 경로 패턴
        // - "/**"로 설정하여 애플리케이션의 모든 엔드포인트에 적용
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }
}