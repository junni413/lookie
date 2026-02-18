package lookie.backend.global.config.websocket;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;
import lookie.backend.global.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.webrtc.mapper.CallHistoryMapper;
import lookie.backend.domain.webrtc.vo.CallHistoryVO;
import lookie.backend.domain.issue.mapper.IssueMapper;
import lookie.backend.domain.issue.vo.IssueVO;
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
    private final IssueMapper issueMapper;
    // [New] AntPathMatcher for robust path matching
    private final org.springframework.util.AntPathMatcher pathMatcher = new org.springframework.util.AntPathMatcher();

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null)
            accessor = StompHeaderAccessor.wrap(message);

        StompCommand command = accessor.getCommand();

        if (StompCommand.CONNECT.equals(command)) {
            verifyToken(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            String destination = accessor.getDestination();
            Authentication user = (Authentication) accessor.getUser();

            if (user == null) {
                log.warn("WebSocket 구독 실패: 인증되지 않은 사용자");
                throw new ApiException(ErrorCode.AUTH_REQUIRED, "Authentication failed: User not authenticated");
            }

            if (destination == null)
                return message;

            // 1. [권한 검사] /topic/video-calls/{callId}
            if (pathMatcher.match("/topic/video-calls/{callId}", destination)) {
                String callIdStr = pathMatcher.extractUriTemplateVariables("/topic/video-calls/{callId}", destination)
                        .get("callId");
                validateSubscription(callIdStr, user.getName());
            }
            // 1.5 [권한 검사] /topic/issues/{issueId} (추가)
            else if (pathMatcher.match("/topic/issues/{issueId}", destination)) {
                String issueIdStr = pathMatcher.extractUriTemplateVariables("/topic/issues/{issueId}", destination)
                        .get("issueId");
                validateIssueSubscription(issueIdStr, user.getName());
            }
            // 2. [Security Fix] /topic/calls/{userId} (본인 확인)
            else if (pathMatcher.match("/topic/calls/{userId}", destination)) {
                String targetUserId = pathMatcher.extractUriTemplateVariables("/topic/calls/{userId}", destination)
                        .get("userId");
                validateOwner(targetUserId, user.getName(), "Topic");
            }
            // 3. [Security Fix] /queue/calls/{userId} (본인 확인)
            else if (pathMatcher.match("/queue/calls/{userId}", destination)) {
                String targetUserId = pathMatcher.extractUriTemplateVariables("/queue/calls/{userId}", destination)
                        .get("userId");
                validateOwner(targetUserId, user.getName(), "Queue");
            }
        } else if (StompCommand.SEND.equals(command)) {
            if (accessor.getUser() == null) {
                throw new ApiException(ErrorCode.AUTH_REQUIRED, "Authentication failed: User not authenticated");
            }
        }

        return message;
    }

    private void verifyToken(StompHeaderAccessor accessor) {
        String authorization = accessor.getFirstNativeHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ApiException(ErrorCode.AUTH_REQUIRED, "Authentication failed: Token missing");
        }
        String token = authorization.substring(7);
        try {
            Claims claims = jwtProvider.validateAndGetClaims(token);
            String userId = claims.getSubject();
            String role = claims.get("role", String.class);
            if (userId != null && role != null) {
                String normalizedRole = jwtProvider.normalizeRole(role);
                Authentication auth = new UsernamePasswordAuthenticationToken(
                        userId, null, List.of(new SimpleGrantedAuthority(normalizedRole)));
                accessor.setUser(auth);
            }
        } catch (JwtException e) {
            throw new ApiException(ErrorCode.AUTH_INVALID_TOKEN, "Authentication failed: Invalid token");
        }
    }

    private void validateSubscription(String callIdStr, String userId) {
        try {
            Long callId = Long.parseLong(callIdStr);
            CallHistoryVO call = callHistoryMapper.findById(callId).orElse(null);

            if (call == null)
                throw new ApiException(ErrorCode.WEBRTC_SESSION_NOT_FOUND, "Subscription failed: Call not found");

            long uid = Long.parseLong(userId);
            if (uid != call.getCallerId() && uid != call.getCalleeId()) {
                throw new ApiException(ErrorCode.AUTH_REQUIRED, "Subscription failed: Access denied");
            }
        } catch (NumberFormatException e) {
            log.warn("Invalid Call ID format");
        }
    }

    private void validateOwner(String targetUserId, String currentUserId, String type) {
        if (!targetUserId.equals(currentUserId)) {
            log.warn("⛔ WebSocket 보안 경고: 타인의 {} 구독 시도 차단 (User={}, Target={})", type, currentUserId, targetUserId);
            throw new ApiException(ErrorCode.AUTH_REQUIRED, "Access Denied: Cannot subscribe to other user's " + type);
        }
    }

    private void validateIssueSubscription(String issueIdStr, String userId) {
        try {
            Long issueId = Long.parseLong(issueIdStr);
            IssueVO issue = issueMapper.findById(issueId);

            if (issue == null)
                throw new ApiException(ErrorCode.ISSUE_NOT_FOUND, "Subscription failed: Issue not found");

            long uid = Long.parseLong(userId);
            if (uid != issue.getWorkerId()) {
                log.warn("⛔ WebSocket 보안 경고: 타인의 이슈 구독 시도 차단 (User={}, IssueId={})", userId, issueId);
                throw new ApiException(ErrorCode.AUTH_REQUIRED, "Subscription failed: Access denied");
            }
        } catch (NumberFormatException e) {
            log.warn("Invalid Issue ID format");
        }
    }
}