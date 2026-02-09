package lookie.backend.global.config;

import io.livekit.server.RoomServiceClient; // [필수] 이거 없으면 에러남
import org.springframework.context.annotation.Bean; // [필수] 이거 없으면 @Bean 인식 못함
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import lombok.Getter;

/**
 * LiveKit 설정 클래스
 * LiveKit Cloud API 인증 정보를 관리합니다.
 */
@Getter
@Configuration
@ConditionalOnProperty(name = "livekit.enabled", havingValue = "true", matchIfMissing = true)
public class LiveKitConfig {

    @Value("${livekit.url}")
    private String url;

    @Value("${livekit.api-key}")
    private String apiKey;

    @Value("${livekit.api-secret}")
    private String apiSecret;

    @Bean
    public RoomServiceClient roomServiceClient() {
        // [수정] wss 프로토콜을 https로 변환하여 사용
        // LiveKit 클라이언트는 wss를 쓰지만, 서버 API(방 삭제 등)는 https를 써야 합니다.
        String httpUrl = url.startsWith("wss://") ? url.replace("wss://", "https://")
                : url.startsWith("ws://") ? url.replace("ws://", "http://")
                        : url;

        return RoomServiceClient.create(httpUrl, apiKey, apiSecret);
    }
}