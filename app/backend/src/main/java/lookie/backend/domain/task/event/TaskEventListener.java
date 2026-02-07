package lookie.backend.domain.task.event;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.control.service.WorkerMonitoringService;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.vo.TaskVO;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * TaskService에서 발행한 이벤트 후처리
 * - AFTER_COMMIT에만 실행됨
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class TaskEventListener {

    private final WorkerMonitoringService workerMonitoringService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTaskCompleted(TaskCompletedEvent event) {
        // 커밋 이후에만 실행되는지 확인하기 위한 로그
        log.info(
                "[AFTER_COMMIT] task completed. taskId={}, workerId={}, zoneId={}",
                event.getTaskId(), event.getWorkerId(), event.getZoneId());
        // TODO: 이후 관제/알림 확장
    }

    /**
     * [추가] 아이템 스캔 완료 시 Redis 진행률 실시간 갱신
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTaskItemCompleted(TaskItemCompletedEvent event) {
        try {
            Long batchTaskId = event.getBatchTaskId();

            // [Optimized] Get zoneId/batchId directly from event
            Long zoneId = event.getZoneId();
            Long batchId = event.getBatchId();

            if (zoneId != null && batchId != null) {
                // 2. Redis 진행률 갱신 (Atomic Increment)
                workerMonitoringService.incrementZoneProgress(zoneId, batchId);
            } else {
                log.warn("[EventListener] Missing context in event. batchTaskId={}, zoneId={}, batchId={}",
                        event.getBatchTaskId(), zoneId, batchId);
            }
        } catch (Exception e) {
            log.error("[EventListener] Error updating zone progress", e);
        }
    }
}
