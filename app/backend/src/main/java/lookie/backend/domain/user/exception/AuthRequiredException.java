package lookie.backend.domain.user.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class AuthRequiredException extends ApiException {

    // 기본 생성자 (단순 실패 시)
    public AuthRequiredException() {
        super(ErrorCode.AUTH_REQUIRED);
    }

    // 상세 정보를 남기기 위한 생성자
    public AuthRequiredException(String path) {
        super(ErrorCode.AUTH_REQUIRED, "인증 필요 구역 접근: " + path);
    }
}
