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
import org.springframework.messaging.support.MessageHeaderAccessor; // [중요] 이거 import 필수!
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
        // [수정 전] StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        // [수정 후] 원본 메시지의 헤더를 직접 참조하도록 변경
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        // 혹시라도 accessor가 null일 경우를 대비해 wrap으로 방어 로직 추가
        if (accessor == null) {
            accessor = StompHeaderAccessor.wrap(message);
        }

        StompCommand command = accessor.getCommand();

        // 1. 연결 요청 (CONNECT): 토큰 검증 수행
        if (StompCommand.CONNECT.equals(command)) {
            String authorization = accessor.getFirstNativeHeader("Authorization");

            if (authorization == null || !authorization.startsWith("Bearer ")) {
                log.warn("WebSocket 연결 실패: 토큰 없음");
                throw new WebSocketAuthenticationException("Authentication failed: Token missing");
            }

            String token = authorization.substring(7);

            try {
                // 토큰 검증 및 파싱
                Claims claims = jwtProvider.validateAndGetClaims(token);
                String userId = claims.getSubject();
                String role = claims.get("role", String.class);

                if (userId != null && role != null) {
                    // normalizeRole을 통해 ROLE_ 접두사 중복 방지
                    String normalizedRole = jwtProvider.normalizeRole(role);
                    Authentication auth = new UsernamePasswordAuthenticationToken(
                            userId, null, List.of(new SimpleGrantedAuthority(normalizedRole)));
                    accessor.setUser(auth);
                    log.info("✅ WebSocket 인증 성공 (CONNECT): userId={}, role={}", userId, normalizedRole);
                }
            } catch (JwtException e) {
                log.warn("WebSocket 연결 실패: 유효하지 않은 토큰");
                throw new WebSocketAuthenticationException("Authentication failed: Invalid token");
            }
        }

        // 2. 다른 요청 (SUBSCRIBE, SEND): 이미 인증된 세션인지 확인
        else if (StompCommand.SUBSCRIBE.equals(command) || StompCommand.SEND.equals(command)) {
            if (accessor.getUser() == null) {
                log.warn("WebSocket 요청 차단: 인증되지 않은 세션 (command={})", command);
                throw new WebSocketAuthenticationException("Authentication failed: User not authenticated");
            }
        }

        return message;
    }
}