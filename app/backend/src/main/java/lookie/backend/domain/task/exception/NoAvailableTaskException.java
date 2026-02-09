package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class NoAvailableTaskException extends ApiException {

    public NoAvailableTaskException(Long zoneId){
        super(ErrorCode.TASK_NO_AVAILABLE, "No available task in zone. zoneId= " + zoneId);
    }
}
