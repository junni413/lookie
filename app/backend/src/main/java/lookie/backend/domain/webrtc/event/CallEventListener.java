package lookie.backend.domain.webrtc.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class CallEventListener {

    @EventListener
    @Async // 비동기 처리 (통화 종료 응답 속도에 영향 안 줌)
    public void handleCallEnded(CallEndedEvent event) {
        log.info("📢 [Event] 통화 종료 이벤트 수신! IssueID: {}", event.getIssueId());
        // 나중에 여기에 issueService.updateStatus("RESOLVED") 추가하면 됨
    }

    @EventListener
    @Async
    public void handleCallRejected(CallRejectedEvent event) {
        log.info("📢 [Event] 통화 거절 이벤트 수신! IssueID: {}", event.getIssueId());
        // 나중에 여기에 issueService.updatePriority("HIGH") 추가하면 됨
    }
}