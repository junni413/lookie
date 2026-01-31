package lookie.backend.domain.task.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lookie.backend.domain.task.constant.NextAction;

/**
 * Task 도메인 전용 응답 래퍼
 * 
 * @param <T> 페이로드 타입 (TaskVO, TaskItemVO 등)
 */
@Getter
@Builder
@AllArgsConstructor
public class TaskResponse<T> {
    private final T payload;
    private final NextAction nextAction;

    public static <T> TaskResponse<T> of(T payload, NextAction nextAction) {
        return new TaskResponse<>(payload, nextAction);
    }
}
