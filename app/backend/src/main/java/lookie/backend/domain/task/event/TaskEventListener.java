package lookie.backend.domain.task.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * TaskService에서 발행한 이벤트 후처리
 * - AFTER_COMMIT에만 실행됨
 */
@Component
@Slf4j
public class TaskEventListener {

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTaskCompleted(TaskCompletedEvent event) {

        // 커밋 이후에만 실행되는지 확인하기 위한 로그
        log.info(
                "[AFTER_COMMIT] task completed. taskId={}, workerId={}, zoneId={}",
                event.getTaskId(), event.getWorkerId(), event.getZoneId()
        );

        // TODO: 이후 관제/알림 확장
    }
}
