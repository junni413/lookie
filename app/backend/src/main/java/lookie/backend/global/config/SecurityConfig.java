package lookie.backend.global.config;

import lookie.backend.global.security.JwtFilter;
import lookie.backend.global.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * [Spring Security 설정 파일]
 * - 인증(Authentication) 및 인가(Authorization) 규칙 정의
 * - JWT 필터 등록 및 CORS/CSRF 설정 관리
 */
@Configuration
@EnableWebSecurity // 스프링 시큐리티 필터 체인 활성화
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtProvider jwtProvider; // JWT 토큰 생성 및 검증 객체 주입

    //application.properties에서 CORS 허용 도메인 목록을 주입받음
    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    /**
     * [비밀번호 암호화 빈 등록]
     * - BCrypt 해싱 함수를 사용하여 비밀번호 안전하게 암호화
     * - 사용처: 회원가입 시(암호화), 로그인 시(비밀번호 일치 여부 확인)
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * [보안 필터 체인 설정]
     * HTTP 요청에 대한 보안 규칙 정의
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. CSRF(Cross-Site Request Forgery) 비활성화
                // - REST API: Stateless(무상태)하므로 CSRF 보호가 불필요
                .csrf(csrf -> csrf.disable())

                // 2. CORS(Cross-Origin Resource Sharing) 설정
                // - 프론트엔드에서의 요청 허용하기 위해 설정 빈 적용
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 3. 기본 인증 방식 비활성화
                // - UI를 통한 로그인(FormLogin)과 HTTP 기본 인증(HttpBasic)을 사용하지 않음
                // - JWT 토큰 방식을 사용하기 때문
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())

                // 4. 세션 관리 정책 설정 (STATELESS)
                // - 서버에 세션을 생성하지 않고, 요청마다 토큰을 통해 인증 수행
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // 5. URL별 접근 권한 설정
                .authorizeHttpRequests(auth -> auth
                        // /api/auth/** 와일드카드 제거하고 필요한 것만 명시 (화이트리스트)
                        .requestMatchers(
                                "/api/auth/signup",           // 회원가입
                                "/api/auth/login",            // 로그인
                                "/api/auth/check/**",         // 중복 확인
                                "/api/auth/email/**",         // 이메일 인증
                                "/api/auth/password/**",      // 비밀번호 찾기
                                "/api/auth/refresh"           // 토큰 재발급
                        ).permitAll()

                        // 실시간 소켓 및 Swagger
                        .requestMatchers("/api/realtime/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-resources/**").permitAll()

                        // [중요] 그 외 모든 요청(로그아웃 포함)은 인증 필요
                        // /api/auth/logout 은 위 목록에 없으므로 여기서 걸러짐
                        .anyRequest().authenticated()
                )

                // 6. 커스텀 필터 등록 (JWT 인증 필터)
                // - UsernamePasswordAuthenticationFilter(기본 로그인 필터) 이전에 JwtFilter 실행
                // - 즉, 스프링 시큐리티가 인증을 확인하기 전에 토큰 검사 먼저 수행
                .addFilterBefore(new JwtFilter(jwtProvider), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * [CORS 설정 빈]
     * - 프론트엔드와의 교차 출처 리소스 공유 허용
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // 하드코딩된 "*" 대신 설정 파일 값 사용 (쉼표로 구분된 여러 도메인 지원)
        // 예: http://localhost:3000,https://mydomain.com
        config.setAllowedOriginPatterns(Arrays.asList(allowedOrigins.split(",")));

        // 허용할 HTTP 메서드 (GET, POST, PUT, DELETE 등)
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

        // 허용할 헤더 (모든 헤더 허용)
        config.setAllowedHeaders(List.of("*"));

        // 자격 증명 허용 (쿠키, Authorization 헤더 등 포함 허용)
        config.setAllowCredentials(true);

        // 위 설정을 모든 경로(/**)에 적용
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}