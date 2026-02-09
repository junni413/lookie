package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class ExpiredTokenException extends ApiException {
    public ExpiredTokenException() {
        super(ErrorCode.AUTH_EXPIRED_TOKEN);
    }

    public ExpiredTokenException(String token) {
        super(ErrorCode.AUTH_EXPIRED_TOKEN, "토큰 만료됨: " + token);
    }
}
