package lookie.backend.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import lombok.Getter;

/**
 * LiveKit 설정 클래스
 * LiveKit Cloud API 인증 정보를 관리합니다.
 */
@Getter
@Configuration
public class LiveKitConfig {

    @Value("${livekit.url}")
    private String url;

    @Value("${livekit.api-key}")
    private String apiKey;

    @Value("${livekit.api-secret}")
    private String apiSecret;

    @org.springframework.context.annotation.Bean
    public io.livekit.server.RoomServiceClient roomServiceClient() {
        return io.livekit.server.RoomServiceClient.create(url, apiKey, apiSecret);
    }
}
