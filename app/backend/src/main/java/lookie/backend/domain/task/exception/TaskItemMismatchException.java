package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class TaskItemMismatchException extends ApiException {
    public TaskItemMismatchException() {
        super(ErrorCode.TASK_ITEM_MISMATCH);
    }
}
