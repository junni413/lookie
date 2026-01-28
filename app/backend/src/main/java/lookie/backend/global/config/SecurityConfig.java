package lookie.backend.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity // 스프링 시큐리티 활성화
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. CSRF 비활성화(위조 방지 해제)
                .csrf(csrf -> csrf.disable())

                // 2. CORS 설정 (아래 만든 corsConfigurationSource 빈을 사용)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 3. 세션 관리 끄기 (나중에 JWT 쓸 거라 세션 안 씀)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // 4. 요청 권한 설정
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/realtime/**").permitAll() // "/api/realtime/**"로 시작하는 소켓 연결은 누구나 가능
                        .anyRequest().permitAll()              // 나머지 API도 테스트를 위해 일단 다 허용
                );

        return http.build();
    }

    // CORS 설정 빈 (모든 곳에서 접속 허용)
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // 모든 출처(Origin) 허용 -> 프론트엔드 주소 상관없이 접속 가능
        config.setAllowedOriginPatterns(List.of("*"));

        // 모든 HTTP 메서드 허용 (GET, POST 등)
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

        // 모든 헤더 허용
        config.setAllowedHeaders(List.of("*"));

        // 자격 증명(쿠키/토큰) 허용 -> 나중에 JWT 보낼 때 필수
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}