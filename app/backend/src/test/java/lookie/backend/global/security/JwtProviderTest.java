package lookie.backend.global.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtProviderTest {

    private JwtProvider jwtProvider;

    @BeforeEach
    void setUp() {
        // 1. 테스트용 가짜 설정값 준비
        // JJWT 0.12.x 버전에선 비밀키가 일정 길이 이상이어야 안전하다고 판단하므로 길게 작성
        String secretKey = "secretKeyForTestingPurposesMustBeLongEnoughToPassSecurityChecks1234567890";
        long accessExpiration = 3600000L;   // 1시간
        long refreshExpiration = 1209600000L; // 14일 (테스트용 값)

        // 2. JwtProvider 객체 직접 생성
        jwtProvider = new JwtProvider(secretKey, accessExpiration, refreshExpiration);
    }

    @Test
    @DisplayName("1. Access Token 발급 및 검증 테스트")
    void accessTokenTest() {
        // given
        String userId = "testUser1234";
        String role = "ROLE_WORKER";

        // when
        String token = jwtProvider.createAccessToken(userId, role);

        // then
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
        // given
        String userId = "testUser5678";

        // when
        // 내부적으로 refreshExpiration을 사용해서 토큰을 만듦
        String token = jwtProvider.createRefreshToken(userId);

        // then
        System.out.println("====== Refresh Token ======");
        System.out.println(token);

        assertThat(token).isNotNull();
        assertThat(jwtProvider.validateToken(token)).isTrue();
        assertThat(jwtProvider.getUserId(token)).isEqualTo(userId);
        assertThat(jwtProvider.getRole(token)).isNull(); // Refresh Token은 Role이 없어야 함
    }
}