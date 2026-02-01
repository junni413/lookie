package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class TaskLocationMismatchException extends ApiException {
    public TaskLocationMismatchException() {
        super(ErrorCode.TASK_LOCATION_MISMATCH);
    }
}
