package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class NoPickableItemException extends ApiException {
    public NoPickableItemException() {
        super(ErrorCode.TASK_NO_AVAILABLE);
    }
}
