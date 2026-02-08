package lookie.backend.domain.issue.dto;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class AdminCallInProgressException extends ApiException {
    public AdminCallInProgressException() {
        super(ErrorCode.ADMIN_CALL_IN_PROGRESS);
    }
}
