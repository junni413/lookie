package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class PendingItemsExistException extends ApiException {
    public PendingItemsExistException() {
        super(ErrorCode.TASK_NOT_RELEASABLE);
    }

    public PendingItemsExistException(String message) {
        super(ErrorCode.TASK_NOT_RELEASABLE, message);
    }
}
