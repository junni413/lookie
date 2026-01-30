package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

/**
 * 유효하지 않은 전화번호 형식 예외
 */
public class InvalidPhoneFormatException extends ApiException {

    public InvalidPhoneFormatException() {
        super(ErrorCode.INVALID_PHONE_FORMAT);
    }

    public InvalidPhoneFormatException(String phoneNumber) {
        super(ErrorCode.INVALID_PHONE_FORMAT, "유효하지 않은 전화번호: " + phoneNumber);
    }
}
