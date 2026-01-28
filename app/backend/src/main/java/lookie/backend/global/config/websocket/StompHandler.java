package lookie.backend.global.config.websocket;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lookie.backend.global.exception.WebSocketAuthenticationException;
import lookie.backend.global.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class StompHandler implements ChannelInterceptor {

    private final JwtProvider jwtProvider;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        StompCommand command = accessor.getCommand();

        // [보안 Fix 2] CONNECT 뿐만 아니라 SUBSCRIBE, SEND 시에도 토큰 검증
        // 연결된 상태에서 토큰이 만료되거나 권한이 바뀌었을 때를 대비
        if (StompCommand.CONNECT.equals(command) ||
                StompCommand.SUBSCRIBE.equals(command) ||
                StompCommand.SEND.equals(command)) {

            String authorization = accessor.getFirstNativeHeader("Authorization");

            // 헤더 검증
            if (authorization == null || !authorization.startsWith("Bearer ")) {
                log.warn("WebSocket 인증 실패: 토큰 없음 또는 잘못된 형식"); // [개선 5] error -> warn (운영 로그 관리)
                throw new WebSocketAuthenticationException("Authentication failed: Token is missing or invalid"); // [보안 Fix 3] 커스텀 예외
            }

            String token = authorization.substring(7);

            try {
                // [개선 6] 중복 파싱 제거 (validateAndGetClaims 사용)
                Claims claims = jwtProvider.validateAndGetClaims(token);

                String userId = claims.getSubject();
                String role = claims.get("role", String.class);

                // [보안 Fix 1] SecurityContext에 인증 정보 저장 (가장 치명적이었던 문제 해결!)
                if (userId != null && role != null) {
                    Authentication auth = new UsernamePasswordAuthenticationToken(
                            userId,
                            null,
                            List.of(new SimpleGrantedAuthority(role))
                    );
                    accessor.setUser(auth); // ⭐ 핵심: 세션에 유저 정보 심기
                    log.debug("WebSocket 인증 성공: userId={}, command={}", userId, command);
                }

            } catch (JwtException e) {
                log.warn("WebSocket 인증 실패: 유효하지 않은 토큰 (원인: {})", e.getMessage());
                throw new WebSocketAuthenticationException("Authentication failed: Invalid token");
            }
        }
        return message;
    }
}