package lookie.backend.domain.issue.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.infra.ai.AiAnalysisClient;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class IssueEventListener {

    private final AiAnalysisClient aiAnalysisClient;

    /**
     * AI 재분석 요청 이벤트 핸들러
     * - 트랜잭션이 성공적으로 커밋된 후에만 실행 (AFTER_COMMIT)
     * - 비동기로 AI 서버 호출
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleIssueRetakeRequested(IssueRetakeRequestedEvent event) {
        log.info("[IssueEventListener] Handling retake request event. issueId={}", event.getIssueId());
        aiAnalysisClient.requestAnalysis(event.toRequest());
    }
}
