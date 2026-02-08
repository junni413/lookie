package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class ToteNotFoundException extends ApiException {
    public ToteNotFoundException() {
        super(ErrorCode.TASK_TOTE_MISMATCH);
    }
}
