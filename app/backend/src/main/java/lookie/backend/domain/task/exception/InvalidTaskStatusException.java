package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class InvalidTaskStatusException extends ApiException {
    public InvalidTaskStatusException() {
        super(ErrorCode.INVALID_TASK_STATUS);
    }

    public InvalidTaskStatusException(String message) {
        super(ErrorCode.INVALID_TASK_STATUS, message);
    }
}
