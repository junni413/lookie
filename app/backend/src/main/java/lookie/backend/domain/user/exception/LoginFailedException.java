package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class LoginFailedException extends ApiException {

    // 기본 생성자 (단순 실패 시)
    public LoginFailedException() {
        super(ErrorCode.AUTH_LOGIN_FAILED);
    }

    // [추가] 상세 정보를 남기기 위한 생성자
    public LoginFailedException(String phone) {
        super(ErrorCode.AUTH_LOGIN_FAILED, "로그인 실패(번호 미존재 혹은 비번 불일치): " + phone);
    }
}