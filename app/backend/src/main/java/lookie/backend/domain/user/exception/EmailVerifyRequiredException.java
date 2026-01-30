package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

/**
 * 이메일 인증 미완료 예외
 * 회원가입 시 이메일 인증을 완료하지 않은 경우 발생
 */
public class EmailVerifyRequiredException extends ApiException {

    public EmailVerifyRequiredException() {
        super(ErrorCode.AUTH_EMAIL_VERIFY_REQUIRED);
    }

    public EmailVerifyRequiredException(String email) {
        super(ErrorCode.AUTH_EMAIL_VERIFY_REQUIRED, "이메일 인증 필요: " + email);
    }
}
