package lookie.backend.domain.task.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class TaskItemNotAssignedException extends ApiException {
    public TaskItemNotAssignedException() {
        super(ErrorCode.TASK_ITEM_NOT_ASSIGNED);
    }
}
