package lookie.backend.global.config.websocket;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lookie.backend.global.exception.WebSocketAuthenticationException;
import lookie.backend.global.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.webrtc.mapper.CallHistoryMapper;
import lookie.backend.domain.webrtc.vo.CallHistoryVO;
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
    private final CallHistoryMapper callHistoryMapper;

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

        // 2. 구독 요청 (SUBSCRIBE): 권한 확인
        else if (StompCommand.SUBSCRIBE.equals(command)) {
            String destination = accessor.getDestination();
            Authentication user = (Authentication) accessor.getUser();

            if (user == null) {
                log.warn("WebSocket 구독 실패: 인증되지 않은 사용자");
                throw new WebSocketAuthenticationException("Authentication failed: User not authenticated");
            }

            // [권한 검사] /topic/video-calls/{callId} 구독 시 참여자(Caller, Callee)인지 확인
            if (destination != null && destination.startsWith("/topic/video-calls/")) {
                validateSubscription(destination, user.getName());
            }

            // [Security Fix] /topic/calls/{userId} 구독 시 본인인지 확인
            else if (destination != null && destination.startsWith("/topic/calls/")) {
                validateTopicOwner(destination, user.getName());
            }
        }

        // 3. 메시지 전송 (SEND): 인증 확인
        else if (StompCommand.SEND.equals(command)) {
            if (accessor.getUser() == null) {
                log.warn("WebSocket 요청 차단: 인증되지 않은 세션 (command={})", command);
                throw new WebSocketAuthenticationException("Authentication failed: User not authenticated");
            }
        }

        return message;
    }

    /**
     * 구독 권한 검증
     * - destination에서 callId 추출
     * - DB 조회 후 callerId 또는 calleeId와 일치하는지 확인
     */
    private void validateSubscription(String destination, String userId) {
        try {
            // URL 파싱: /topic/video-calls/{callId}
            String[] parts = destination.split("/");
            if (parts.length < 4) {
                return; // 형식이 맞지 않으면 패스 (혹은 예외)
            }
            Long callId = Long.parseLong(parts[3]);

            // DB 조회
            CallHistoryVO call = callHistoryMapper.findById(callId).orElse(null);

            if (call == null) {
                log.warn("WebSocket 구독 차단: 존재하지 않는 Call ID ({})", callId);
                throw new WebSocketAuthenticationException("Subscription failed: Call not found");
            }

            // 참여자 확인
            long uid = Long.parseLong(userId);
            if (uid != call.getCallerId() && uid != call.getCalleeId()) {
                log.warn("WebSocket 구독 차단: 권한 없음 (User={}, CallId={})", userId, callId);
                throw new WebSocketAuthenticationException("Subscription failed: Access denied");
            }

            log.info("✅ WebSocket 구독 승인: callId={}, userId={}", callId, userId);

        } catch (NumberFormatException e) {
            log.warn("WebSocket 구독 실패: 잘못된 Call ID 형식 ({})", destination);
        }
    }

    /**
     * [Security Fix] Topic 소유자 검증
     * - /topic/calls/{targetUserId} 구독 시 targetUserId == currentUserId 인지 확인
     */
    private void validateTopicOwner(String destination, String currentUserId) {
        try {
            // URL 파싱: /topic/calls/{userId}
            String[] parts = destination.split("/");
            if (parts.length < 4) {
                throw new WebSocketAuthenticationException("Subscription failed: Invalid topic format");
            }
            String targetUserId = parts[3];

            if (!targetUserId.equals(currentUserId)) {
                log.warn("⛔ WebSocket 보안 경고: 타인의 Topic 구독 시도 차단 (User={}, Target={})", currentUserId, targetUserId);
                throw new WebSocketAuthenticationException("Access Denied: Cannot subscribe to other user's topic");
            }
            
            log.info("✅ WebSocket 본인 Topic 구독 승인 (User={})", currentUserId);

        } catch (Exception e) {
            log.error("WebSocket 구독 검증 중 오류: {}", e.getMessage());
            throw new WebSocketAuthenticationException("Subscription validation failed");
        }
    }
}