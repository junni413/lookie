package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class TaskLockFailedException extends ApiException {

    public TaskLockFailedException(String lockKey) {
        super(ErrorCode.SYSTEM_TEMPORARY_LOCK_FAILED, "Redis lock acquisition failed. lockKey=" + lockKey);
    }
}
