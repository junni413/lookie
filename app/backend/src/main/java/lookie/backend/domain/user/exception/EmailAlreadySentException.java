package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

/**
 * 이메일 인증번호 재발송 제한 예외
 * 1분 내 중복 발송 시도 시 발생
 */
public class EmailAlreadySentException extends ApiException {

    public EmailAlreadySentException() {
        super(ErrorCode.AUTH_EMAIL_ALREADY_SENT);
    }

    public EmailAlreadySentException(String email) {
        super(ErrorCode.AUTH_EMAIL_ALREADY_SENT, "1분 내 재발송 제한: " + email);
    }
}
