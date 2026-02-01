package lookie.backend.domain.location.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class LocationZoneMismatchException extends ApiException {
    public LocationZoneMismatchException() {
        super(ErrorCode.LOCATION_ZONE_MISMATCH);
    }
}
