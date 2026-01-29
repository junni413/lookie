package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class TaskAlreadyAssignedException extends ApiException {

    public TaskAlreadyAssignedException(Long taskId) {
        super(ErrorCode.TASK_ALREADY_ASSIGNED, "작업이 이미 다른 작업자에게 할당되었습니다. taskId=" + taskId);
    }
}
