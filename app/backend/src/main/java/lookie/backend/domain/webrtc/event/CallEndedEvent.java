package lookie.backend.domain.webrtc.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CallEndedEvent {
    private Long callId;
    private Long issueId;  // Nullable
    private Long callerId;
    private Long calleeId;
}