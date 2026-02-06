package lookie.backend.domain.task.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * TaskItem 상태가 DONE 또는 ISSUE로 완료 처리되었을 때 발행되는 이벤트
 * - Redis 집계 갱신 트리거로 사용됨
 */
@Getter
@AllArgsConstructor
public class TaskItemCompletedEvent {
    private Long batchTaskItemId;
    private Long batchTaskId;
}
