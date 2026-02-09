package lookie.backend.domain.task.exception;

import lookie.backend.domain.task.vo.TaskActionStatus;
import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class InvalidTaskActionStateException extends ApiException {
    public InvalidTaskActionStateException(TaskActionStatus current, TaskActionStatus expected) {
        super(ErrorCode.TASK_INVALID_STATE,
                String.format("Invalid action state transition. Current: %s, Expected: %s", current, expected));
    }
}
