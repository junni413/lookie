package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class InvalidActionStatusException extends ApiException {
    public InvalidActionStatusException() {
        super(ErrorCode.INVALID_ACTION_STATUS);
    }

    public InvalidActionStatusException(String message) {
        super(ErrorCode.INVALID_ACTION_STATUS, message);
    }
}
