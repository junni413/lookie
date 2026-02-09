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
    private final Object nextItem; // 다음 진행할 상품 정보 (TaskItemVO 등)

    public static <T> TaskResponse<T> of(T payload, NextAction nextAction) {
        return new TaskResponse<>(payload, nextAction, null);
    }

    public static <T> TaskResponse<T> of(T payload, NextAction nextAction, Object nextItem) {
        return new TaskResponse<>(payload, nextAction, nextItem);
    }
}
