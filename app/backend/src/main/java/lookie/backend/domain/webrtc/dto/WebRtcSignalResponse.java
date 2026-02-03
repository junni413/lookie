package lookie.backend.domain.webrtc.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WebRtcSignalResponse {
    private WebRtcSignalType type;
    private Long callId;
    private String roomId; // Nullable (only for ACCEPTED)
    private Long timestamp;

    public static WebRtcSignalResponse from(WebRtcSignalType type, Long callId, String roomId) {
        return WebRtcSignalResponse.builder()
                .type(type)
                .callId(callId)
                .roomId(roomId)
                .timestamp(System.currentTimeMillis())
                .build();
    }
}
