package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class TaskNotFoundException extends ApiException {

    public TaskNotFoundException(Long taskId) {
        super(ErrorCode.TASK_NOT_FOUND, "Task not found. taskId= " + taskId);
    }
}
