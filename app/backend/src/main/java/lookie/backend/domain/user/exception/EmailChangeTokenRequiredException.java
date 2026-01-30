package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

/**
 * 이메일 변경 시 토큰 검증이 필요한 경우 발생하는 예외
 * 이메일 변경 OTP 인증을 먼저 완료해야 함
 */
public class EmailChangeTokenRequiredException extends ApiException {

    public EmailChangeTokenRequiredException() {
        super(ErrorCode.AUTH_EMAIL_CHANGE_TOKEN_REQUIRED);
    }

    public EmailChangeTokenRequiredException(String email) {
        super(ErrorCode.AUTH_EMAIL_CHANGE_TOKEN_REQUIRED, "이메일 변경 인증 필요: " + email);
    }
}
