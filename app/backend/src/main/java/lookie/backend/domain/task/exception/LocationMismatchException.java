package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class LocationMismatchException extends ApiException {
    public LocationMismatchException() {
        super(ErrorCode.TASK_LOCATION_MISMATCH);
    }
}
