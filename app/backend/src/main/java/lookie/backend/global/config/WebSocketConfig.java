package lookie.backend.global.config;

import lookie.backend.global.config.websocket.StompHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompHandler stompHandler; // 보안 인증(Interceptor)

    @Value("${cors.allowed-origins}")
    private String allowedOrigins; // 설정 파일에서 가져온 CORS 도메인

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 기존 코드의 엔드포인트 유지 (/api/realtime/connect)
        registry.addEndpoint("/api/realtime/connect")
                .setAllowedOriginPatterns(allowedOrigins.split(",")) // CORS 설정 적용
                .withSockJS(); // SockJS 지원
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 기존 코드의 구독 경로 유지 (/topic)
        // 예: /topic/control, /topic/zones/{zoneId}
        registry.enableSimpleBroker("/topic", "/queue");

        // 기존 코드의 발행 경로 유지 (/app)
        // 클라이언트가 메시지를 보낼 때: /app/메시지경로
        registry.setApplicationDestinationPrefixes("/app");
    }

    /**
     * 3. 인터셉터 등록 (보안 추가)
     * - JWT 토큰 검사를 위해 StompHandler를 채널에 등록
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompHandler);
    }
}