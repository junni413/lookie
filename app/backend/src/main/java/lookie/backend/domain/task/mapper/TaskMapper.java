package lookie.backend.domain.task.mapper;

import lookie.backend.domain.task.vo.TaskVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface TaskMapper {
    // [조회] 작업 ID로 조회
    TaskVO findById(Long taskId);

    // [조회] 다음 할당할 작업 찾기
    TaskVO findNextUnassignedForZoneForUpdate(@Param("zoneId") Long zoneId);

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
}
