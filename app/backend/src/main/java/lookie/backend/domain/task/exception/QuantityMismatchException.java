package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class QuantityMismatchException extends ApiException {
    public QuantityMismatchException() {
        super(ErrorCode.TASK_ITEM_QUANTITY_NOT_SUFFICIENT);
    }

    public QuantityMismatchException(String message) {
        super(ErrorCode.TASK_ITEM_QUANTITY_NOT_SUFFICIENT, message);
    }
}
