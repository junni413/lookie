package lookie.backend.global.exception;

import org.springframework.messaging.MessagingException;

/**
 * [WebSocket 보안 전용 예외]
 * - 일반적인 IllegalArgumentException 대신 사용하여 보안 예외임을 명시
 * - 클라이언트에게 구체적인 서버 에러 로그를 노출하지 않기 위함
 */
public class WebSocketAuthenticationException extends MessagingException {
    public WebSocketAuthenticationException(String message) {
        super(message);
    }
}