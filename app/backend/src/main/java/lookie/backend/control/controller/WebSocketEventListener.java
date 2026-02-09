package lookie.backend.control.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Slf4j
@Component
public class WebSocketEventListener {

    // 누군가 연결(Connect)했을 때 실행
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        log.info("✅ 새로운 웹소켓 연결 감지됨 (New Connection)");
    }

    // 누군가 연결을 끊었거나(Disconnect), 끊겼을 때 실행
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        log.info("❌ 웹소켓 연결 종료됨 (Disconnected)");
    }
}