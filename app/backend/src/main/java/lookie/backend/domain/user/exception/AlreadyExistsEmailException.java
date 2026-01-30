package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class AlreadyExistsEmailException extends ApiException {

    public AlreadyExistsEmailException() {
        super(ErrorCode.USER_ALREADY_EXISTS_EMAIL);
    }

    public AlreadyExistsEmailException(String email) {
        super(ErrorCode.USER_ALREADY_EXISTS_EMAIL, "중복 가입 시도(이메일): " + email);
    }
}
