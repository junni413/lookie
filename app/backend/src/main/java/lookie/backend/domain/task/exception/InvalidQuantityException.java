package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class InvalidQuantityException extends ApiException {
    public InvalidQuantityException() {
        super(ErrorCode.TASK_ITEM_QUANTITY_EXCEEDED);
    }
}
