package lookie.backend.domain.webrtc.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WebRtcSignalResponse {
    private WebRtcSignalType type;
    private Long callId;
    private String roomId; // Nullable (only for ACCEPTED)
    private Long senderId;
    private Long timestamp;

    public static WebRtcSignalResponse from(WebRtcSignalType type, Long callId, String roomId, Long senderId) {
        return WebRtcSignalResponse.builder()
                .type(type)
                .callId(callId)
                .roomId(roomId)
                .senderId(senderId)
                .timestamp(System.currentTimeMillis())
                .build();
    }
}
