package lookie.backend.global.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Slf4j
@Component
public class JwtProvider {

    private final SecretKey secretKey;
    private final long accessExpiration;
    private final long refreshExpiration;

    /**
     * 1. 생성자: 설정 파일에서 비밀키와 Access Token 만료 시간을 가져옴
     * (@Value 사용하여 application.properties 값을 주입받음)
     */
    // [수정] 생성자에서 refreshExpiration 주입 받음
    public JwtProvider(@Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long accessExpiration,
            @Value("${jwt.refresh-expiration}") long refreshExpiration) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpiration = accessExpiration;
        this.refreshExpiration = refreshExpiration;
    }

    /**
     * 2. Access Token 생성 (단기용)
     * - 용도: API 요청 시 인증용
     * - 수명: application.properties에 설정된 시간 (예: 1시간)
     * - 포함 정보: 유저 ID, 권한(Role)
     */
    public String createAccessToken(String userId, String role) {
        return createToken(userId, role, accessExpiration);
    }

    /**
     * 3. Refresh Token 생성 (장기용)
     * - 용도: Access Token 만료 시 재발급용
     * - 수명: 14일 (고정)
     * - 포함 정보: 유저 ID (권한 정보는 제외)
     */
    public String createRefreshToken(String userId) {
        return createToken(userId, null, refreshExpiration);
    }

    /**
     * (내부용) 실제 토큰 생성 로직
     * 중복 코드를 방지하기 위해 분리한 Private 메서드
     */
    private String createToken(String userId, String role, long expiration) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + expiration);

        JwtBuilder builder = Jwts.builder()
                .subject(userId) // 토큰 주인 (ID)
                .issuedAt(now) // 발급 시간
                .expiration(validity) // 만료 시간
                .signWith(secretKey); // 비밀키 서명

        // 역할(Role)이 있는 경우에만 Payload에 추가 (Refresh Token은 null이라 추가 안 됨)
        // Spring Security 컨벤션: ROLE_ 접두사 추가
        if (role != null) {
            builder.claim("role", "ROLE_" + role);
        }

        return builder.compact();
    }

    /**
     * 4. 토큰 검증
     * [주의] 이 메서드는 토큰의 서명(Signature)과 만료(Expires) 여부, 구조적 유효성만 검사합니다.
     * Access Token인지 Refresh Token인지(Role 유무 등)는 구분하지 않으므로,
     * 비즈니스 로직(Filter 등)에서 용도에 맞는 추가 검증이 필요합니다.
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (SecurityException | MalformedJwtException e) {
            log.error("잘못된 JWT 서명입니다.");
        } catch (ExpiredJwtException e) {
            log.error("만료된 JWT 토큰입니다.");
        } catch (UnsupportedJwtException e) {
            log.error("지원되지 않는 JWT 토큰입니다.");
        } catch (IllegalArgumentException e) {
            log.error("JWT 토큰이 잘못되었습니다.");
        }
        return false;
    }

    /**
     * 5. 토큰 정보 추출: 사용자 ID(Subject)
     */
    public String getUserId(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    /**
     * 6. 토큰 정보 추출: 역할(Role)
     * - Refresh Token에는 role이 없으므로 null을 반환할 수 있음
     */
    public String getRole(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .get("role", String.class);
    }

    /**
     * 7. 성능 최적화: 토큰 검증 및 클레임 추출을 한 번에 수행
     * - 기존: validateToken() -> getUserId() -> getRole() (3번 서명 검증)
     * - 개선: validateAndGetClaims() (1번 서명 검증으로 끝)
     * - StompHandler에서 사용
     */
    public io.jsonwebtoken.Claims validateAndGetClaims(String token) {
        try {
            return io.jsonwebtoken.Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            // 유효하지 않은 토큰이면 예외를 던져서 호출부(StompHandler)에서 처리하게 함
            throw new io.jsonwebtoken.JwtException("Invalid JWT token", e);
        }
    }

    /**
     * 8. 토큰의 남은 유효 시간 계산 (밀리초 단위)
     * - 용도: 로그아웃 시 블랙리스트에 등록할 때 TTL 설정용
     * - 만료된 토큰의 경우 0을 반환
     * 
     * @param token JWT 토큰
     * @return 남은 유효 시간 (밀리초), 만료된 경우 0
     */
    public long getRemainingTime(String token) {
        try {
            Date expiration = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .getExpiration();

            long remainingTime = expiration.getTime() - System.currentTimeMillis();
            return Math.max(0, remainingTime); // 음수 방지
        } catch (JwtException | IllegalArgumentException e) {
            log.error("토큰 만료 시간 추출 실패: {}", e.getMessage());
            return 0;
        }
    }
}