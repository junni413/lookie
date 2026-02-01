package lookie.backend.global.config;

import io.openvidu.java.client.OpenVidu;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenViduConfig {

    @Value("${openvidu.url}")
    private String openviduUrl;

    @Value("${openvidu.secret}")
    private String openviduSecret;

    @Bean
    public OpenVidu openvidu() {
        // 이 @Bean이 있어야 Service에서 OpenVidu 객체를 주입받을 수 있습니다!
        return new OpenVidu(openviduUrl, openviduSecret);
    }
}