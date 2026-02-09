package lookie.backend.domain.location.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class LocationNotFoundException extends ApiException {
    public LocationNotFoundException() {
        super(ErrorCode.LOCATION_NOT_FOUND);
    }
}
