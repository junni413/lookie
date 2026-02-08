package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class InvalidItemStatusException extends ApiException {
    public InvalidItemStatusException() {
        super(ErrorCode.INVALID_ITEM_STATUS);
    }

    public InvalidItemStatusException(String message) {
        super(ErrorCode.INVALID_ITEM_STATUS, message);
    }
}
