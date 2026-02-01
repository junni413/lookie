package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class ItemQuantityNotSufficientException extends ApiException {
    public ItemQuantityNotSufficientException() {
        super(ErrorCode.TASK_ITEM_QUANTITY_NOT_SUFFICIENT);
    }
}
