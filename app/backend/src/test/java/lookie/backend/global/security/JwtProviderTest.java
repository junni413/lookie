package lookie.backend.global.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtProviderTest {

    private JwtProvider jwtProvider;

    @BeforeEach
    void setUp() {
        // DB 연결 없이 가짜 키값으로 객체 생성 (순수 자바 테스트)
        String secretKey = "secretKeyForTestingPurposesMustBeLongEnoughToPassSecurityChecks1234567890";
        long expiration = 3600000L; // 1시간

        jwtProvider = new JwtProvider(secretKey, expiration);
    }

    @Test
    @DisplayName("1. Access Token 발급 및 검증 테스트")
    void accessTokenTest() {
        String userId = "testUser1234";
        String role = "ROLE_WORKER";

        String token = jwtProvider.createAccessToken(userId, role);

        System.out.println("====== Access Token ======");
        System.out.println(token);

        assertThat(token).isNotNull();
        assertThat(jwtProvider.validateToken(token)).isTrue();
        assertThat(jwtProvider.getUserId(token)).isEqualTo(userId);
        assertThat(jwtProvider.getRole(token)).isEqualTo(role);
    }

    @Test
    @DisplayName("2. Refresh Token 발급 및 검증 테스트")
    void refreshTokenTest() {
        String userId = "testUser5678";

        String token = jwtProvider.createRefreshToken(userId);

        System.out.println("====== Refresh Token ======");
        System.out.println(token);

        assertThat(token).isNotNull();
        assertThat(jwtProvider.validateToken(token)).isTrue();
        assertThat(jwtProvider.getUserId(token)).isEqualTo(userId);
        assertThat(jwtProvider.getRole(token)).isNull();
    }
}