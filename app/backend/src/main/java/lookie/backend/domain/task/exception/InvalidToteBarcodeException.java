package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class InvalidToteBarcodeException extends ApiException {
    public InvalidToteBarcodeException() {
        super(ErrorCode.TASK_TOTE_MISMATCH);
    }
}
