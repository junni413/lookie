package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

/**
 * 유효하지 않은 이메일 형식 예외
 */
public class InvalidEmailFormatException extends ApiException {

    public InvalidEmailFormatException() {
        super(ErrorCode.INVALID_EMAIL_FORMAT);
    }

    public InvalidEmailFormatException(String email) {
        super(ErrorCode.INVALID_EMAIL_FORMAT, "유효하지 않은 이메일: " + email);
    }
}
