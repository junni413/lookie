package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

/**
 * 이메일 인증번호 만료/불일치 예외
 * 5분 경과 또는 인증번호 불일치 시 발생
 */
public class EmailCodeExpiredException extends ApiException {

    public EmailCodeExpiredException() {
        super(ErrorCode.AUTH_EMAIL_CODE_EXPIRED);
    }

    public EmailCodeExpiredException(String email) {
        super(ErrorCode.AUTH_EMAIL_CODE_EXPIRED, "인증번호 만료 또는 불일치: " + email);
    }
}
