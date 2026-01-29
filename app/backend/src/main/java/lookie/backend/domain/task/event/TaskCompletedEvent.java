package lookie.backend.domain.task.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Task 완료 Event를 위한 DTO
 */
@Getter
@AllArgsConstructor
public class TaskCompletedEvent {

    private final Long taskId; // 완료된 작업 Id
    private final Long workerId; // 수행 작업자 Id
    private final Long zoneId; // 작업 구역 Id


}
