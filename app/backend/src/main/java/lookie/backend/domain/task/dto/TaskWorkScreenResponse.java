package lookie.backend.domain.task.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lookie.backend.domain.task.vo.TaskActionStatus;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.task.vo.TaskVO;

/**
 * TaskWorkScreenResponse - 작업 화면 응답 DTO
 * Pseudo Code 7장 buildWorkScreen 결과
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskWorkScreenResponse {
    private TaskVO task;
    private TaskItemVO nextItem;
    private TaskActionStatus actionStatus;
    private Long currentLocationId;
}
