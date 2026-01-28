package lookie.backend.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker // 1. 웹소켓 메시지 브로커 기능 활성화
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 2. 소켓 연결 엔드포인트 설정
        registry.addEndpoint("/api/realtime/connect")
                .setAllowedOriginPatterns("*"); // CORS: 모든 출처 허용
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 3. 구독(Subscribe) 경로 설정 - 서버가 메시지를 보낼 때 쓰는 접두사
        // 예: /topic/control, /topic/zones/{zoneId}
        registry.enableSimpleBroker("/topic");

        // 4. 발행(Publish) 경로 설정 - 클라이언트가 메시지를 보낼 때 쓰는 접두사
        registry.setApplicationDestinationPrefixes("/app");
    }
}