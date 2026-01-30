package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

/**
 * 유효하지 않은 비밀번호 형식 예외
 * 7~15자의 영문, 숫자 조합이 아닌 경우 발생
 */
public class InvalidPasswordFormatException extends ApiException {

    public InvalidPasswordFormatException() {
        super(ErrorCode.INVALID_PASSWORD_FORMAT);
    }

    public InvalidPasswordFormatException(String message) {
        super(ErrorCode.INVALID_PASSWORD_FORMAT, message);
    }
}
