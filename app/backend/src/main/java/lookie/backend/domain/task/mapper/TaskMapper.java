package lookie.backend.domain.task.mapper;

import lookie.backend.domain.task.vo.TaskActionStatus;
import lookie.backend.domain.task.vo.TaskVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface TaskMapper {
        // [조회] 작업 ID로 조회
        TaskVO findById(Long taskId);

        // [조회] 다음 할당할 작업 찾기
        TaskVO findNextUnassignedForZoneForUpdate(@Param("zoneId") Long zoneId);

        // [조회] 작업자가 현재 진행 중인 작업이 있는지 확인
        TaskVO findInProgressByWorkerId(@Param("workerId") Long workerId);

        // [수정] 할당된 작업 상태 변경
        int updateAssignToInProgress(
                        @Param("batchTaskId") Long batchTaskId,
                        @Param("workerId") Long workerId);

        // [수정] 작업 완료 상태 변경
        int updateComplete(@Param("batchTaskId") Long batchTaskId);

        // [수정] 토트 스캔 결과 업데이트 (SCAN_TOTE -> SCAN_LOCATION)
        int updateToteScanResult(@Param("batchTaskId") Long batchTaskId, @Param("toteId") Long toteId);

        // [수정] 지번 스캔 결과 업데이트 (SCAN_LOCATION -> SCAN_ITEM)
        int updateLocationScanResult(
                        @Param("batchTaskId") Long batchTaskId,
                        @Param("locationId") Long locationId);

        // [수정] 작업 액션 상태 강제 업데이트
        int updateActionStatus(
                        @Param("batchTaskId") Long batchTaskId,
                        @Param("actionStatus") TaskActionStatus actionStatus);

        // [조회] 배치 내 진행 중인 Task 개수 조회
        int countInProgressTasksByBatch(@Param("batchId") Long batchId);

        // [조회] 작업 ID로 조회 (FOR UPDATE - 새 FSM용)
        TaskVO findByIdForUpdate(@Param("taskId") Long taskId);

        // [수정] Task 전체 업데이트 (새 FSM용)
        int updateTask(TaskVO task);
}
