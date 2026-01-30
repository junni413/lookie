package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class InvalidTokenException extends ApiException {

    public InvalidTokenException() {
        super(ErrorCode.AUTH_INVALID_TOKEN);
    }

    public InvalidTokenException(String token) {
        super(ErrorCode.AUTH_INVALID_TOKEN, "유효하지 않은 토큰: " + token);
    }
}
