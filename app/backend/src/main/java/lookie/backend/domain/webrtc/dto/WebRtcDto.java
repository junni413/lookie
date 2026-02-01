package lookie.backend.domain.webrtc.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public class WebRtcDto {

    // [1] 화상 전화 걸기 요청
    @Getter
    @NoArgsConstructor
    public static class CallRequest {
        private Long callerId;
        private Long calleeId;
        private Long issueId;
    }

    // [2] 화상 전화 걸기 응답
    @Getter
    @AllArgsConstructor
    public static class CallResponse {
        private Long callId;       // DB PK
        private String sessionId;  // OpenVidu Session ID
        private String token;      // Caller 본인 입장 토큰
    }

    // [3] (추천) 토큰 응답 (수락 시 사용)
    // 물론 String 그대로 써도 되지만, { "token": "wss://..." } 형태가 더 명확합니다.
    @Getter
    @AllArgsConstructor
    public static class TokenResponse {
        private String token;
    }
}