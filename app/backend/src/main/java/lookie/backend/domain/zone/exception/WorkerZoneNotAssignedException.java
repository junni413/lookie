package lookie.backend.domain.zone.exception;

import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;

public class WorkerZoneNotAssignedException extends ApiException {

    public WorkerZoneNotAssignedException(Long workerId) {
        super(ErrorCode.WORKER_ZONE_NOT_ASSIGNED, "작업자에게 배정된 작업 구역이 없습니다. workerId= " + workerId);
    }
}
