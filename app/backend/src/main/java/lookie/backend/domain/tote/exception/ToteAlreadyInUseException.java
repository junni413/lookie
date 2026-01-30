package lookie.backend.domain.tote.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class ToteAlreadyInUseException extends ApiException {
    public ToteAlreadyInUseException() {
        super(ErrorCode.TOTE_ALREADY_IN_USE);
    }
}
