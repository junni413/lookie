package lookie.backend.global.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

/**
 * JWT 인증 필터
 * 모든 API 요청이 들어올 때마다 가장 먼저 실행되어 토큰 검사
 * - 블랙리스트 확인: 로그아웃된 토큰인지 Redis에서 검증
 * - 유효한 토큰이면: 인증 정보(Authentication)를 만들어 SecurityContext에 저장
 * - 유효하지 않거나 토큰이 없으면: 아무 작업 없이 다음 필터로 넘김 (이후 SecurityConfig에서 걸러짐)
 */
@Slf4j
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final StringRedisTemplate redisTemplate;

    /**
     * 필터의 핵심 로직 (모든 HTTP 요청마다 1번씩 실행됨)
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // 1. Request Header에서 토큰 추출
        String token = resolveToken(request);

        // 2. 토큰 유효성 검사
        if (StringUtils.hasText(token) && jwtProvider.validateToken(token)) {

            // 3. 블랙리스트 확인 (로그아웃된 토큰인지 검증)
            String blacklistKey = "blacklist:" + token;
            if (Boolean.TRUE.equals(redisTemplate.hasKey(blacklistKey))) {
                log.warn("블랙리스트에 등록된 토큰입니다. 인증을 거부합니다.");
                filterChain.doFilter(request, response);
                return;
            }

            String userId = jwtProvider.getUserId(token);
            String role = jwtProvider.getRole(token);

            // [수정] role이 null이 아닐 때만 인증 처리 (NPE 방지)
            if (userId != null && role != null) {
                Authentication authentication = new UsernamePasswordAuthenticationToken(userId, null,
                        List.of(new SimpleGrantedAuthority(role)));

                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("Security Context에 '{}' 인증 정보를 저장했습니다. 권한: {}", userId, role);
            } else {
                log.warn("유효한 토큰이지만 Role 정보가 없습니다. (Refresh Token일 가능성) User: {}", userId);
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Request Header에서 토큰 정보 꺼내오기
     * "Authorization: Bearer <TOKEN>" 형식에서 "Bearer " 접두사를 제거하고 <TOKEN>만 반환
     */
    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        // 헤더가 존재하고, "Bearer "로 시작하는 경우에만 추출
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7); // 앞의 "Bearer " 7글자 자르고 뒤에 토큰만 리턴
        }
        return null;
    }
}