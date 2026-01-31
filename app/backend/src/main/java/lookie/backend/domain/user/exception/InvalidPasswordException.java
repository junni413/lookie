package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class InvalidPasswordException extends ApiException {
    public InvalidPasswordException() {
        super(ErrorCode.USER_INVALID_PASSWORD);
    }
}
