package lookie.backend.domain.webrtc.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.issue.service.IssueServiceNew;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class CallEventListener {

    private final IssueServiceNew issueServiceNew;

    /**
     * 통화 종료 이벤트 처리 (CONNECTED)
     * - 분기표 D3, D6, D10, S2 노드
     */
    @EventListener
    @Async // 비동기 처리 (통화 종료 응답 속도에 영향 안 줌)
    public void handleCallEnded(CallEndedEvent event) {
        log.info("📢 [Event] 통화 종료 이벤트 수신! IssueID: {}", event.getIssueId());

        try {
            issueServiceNew.onWebrtcConnected(event.getIssueId());
            log.info("✅ [Event] WebRTC CONNECTED 처리 완료. IssueID: {}", event.getIssueId());
        } catch (Exception e) {
            log.error("❌ [Event] WebRTC CONNECTED 처리 실패. IssueID: {}", event.getIssueId(), e);
        }
    }

    /**
     * 통화 거절 이벤트 처리 (MISSED/REJECTED)
     * - 분기표 D4, D7, D11, S3 노드
     */
    @EventListener
    @Async
    public void handleCallRejected(CallRejectedEvent event) {
        log.info("📢 [Event] 통화 거절 이벤트 수신! IssueID: {}", event.getIssueId());

        try {
            issueServiceNew.onWebrtcMissed(event.getIssueId());
            log.info("✅ [Event] WebRTC MISSED 처리 완료. IssueID: {}", event.getIssueId());
        } catch (Exception e) {
            log.error("❌ [Event] WebRTC MISSED 처리 실패. IssueID: {}", event.getIssueId(), e);
        }
    }
}