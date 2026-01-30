package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class UserNotFoundException extends ApiException {

    public UserNotFoundException() {
        super(ErrorCode.USER_NOT_FOUND);
    }

    public UserNotFoundException(String id) {
        super(ErrorCode.USER_NOT_FOUND, "사용자 조회 실패. ID: " + id);
    }
}
