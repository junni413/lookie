package lookie.backend.domain.task.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 아이템 작업이 완료 상태(DONE, ISSUE 등)에서 다시 PENDING으로 되돌아갔을 때 발행
 * - Redis 집계 차감(-1) 등에 사용
 */
@Getter
@AllArgsConstructor
public class TaskItemRevertedEvent {
    private Long batchTaskItemId;
    private Long batchTaskId;

    /**
     * Redis 최적화를 위해 zoneId, batchId를 이벤트에 포함
     * (리스너에서 DB 조회 방지)
     */
    private Long zoneId;
    private Long batchId;
}
