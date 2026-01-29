package lookie.backend.domain.task.exception;

import lookie.backend.domain.task.vo.TaskStatus;
import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class InvalidTaskStateException extends ApiException {
    public InvalidTaskStateException(TaskStatus from, TaskStatus to){
        super(ErrorCode.TASK_INVALID_STATE, "Invalid task state tansition: " + from + " -> " + to);
    }

}
