package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class WorkerAlreadyHasTaskException extends ApiException {
    public WorkerAlreadyHasTaskException() {
        super(ErrorCode.WORKER_ALREADY_HAS_TASK);
    }
}
