package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class AlreadyExistsPhoneException extends ApiException {

    public AlreadyExistsPhoneException() {
        super(ErrorCode.USER_ALREADY_EXISTS_PHONE);
    }

    public AlreadyExistsPhoneException(String phone) {
        super(ErrorCode.USER_ALREADY_EXISTS_PHONE, "중복 가입 시도(전화번호): " + phone);
    }
}
