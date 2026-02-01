package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class DeletedUserException extends ApiException {
    public DeletedUserException() {
        super(ErrorCode.USER_DELETED);
    }
}
