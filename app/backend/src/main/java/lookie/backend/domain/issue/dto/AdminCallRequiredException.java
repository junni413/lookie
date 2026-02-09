package lookie.backend.domain.issue.dto;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class AdminCallRequiredException extends ApiException {
    public AdminCallRequiredException() {
        super(ErrorCode.ADMIN_CALL_REQUIRED);
    }
}
