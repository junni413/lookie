package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class ItemMismatchException extends ApiException {
    public ItemMismatchException() {
        super(ErrorCode.ITEM_NOT_FOUND);
    }
}
