package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

/**
 * 이메일 발송 실패 예외
 * SMTP 서버 오류, 네트워크 문제 등으로 이메일 발송 실패 시 발생
 */
public class EmailSendFailedException extends ApiException {

    public EmailSendFailedException() {
        super(ErrorCode.EMAIL_SEND_FAILED);
    }

    public EmailSendFailedException(String email) {
        super(ErrorCode.EMAIL_SEND_FAILED, "이메일 발송 실패: " + email);
    }
}
