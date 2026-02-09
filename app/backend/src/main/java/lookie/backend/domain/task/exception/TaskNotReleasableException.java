package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class TaskNotReleasableException extends ApiException {
    public TaskNotReleasableException() {
        super(ErrorCode.TASK_NOT_RELEASABLE);
    }
}
