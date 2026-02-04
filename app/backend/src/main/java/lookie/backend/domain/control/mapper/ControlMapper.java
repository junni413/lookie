package lookie.backend.domain.control.mapper;

import java.util.List;
import lookie.backend.domain.control.dto.ZoneOverviewDto;
import lookie.backend.domain.control.dto.WorkerHoverDto;
import lookie.backend.domain.control.dto.map.ZoneLineDto;
import lookie.backend.domain.control.dto.map.ZoneWorkerLocationDto;

import lookie.backend.domain.control.dto.ZoneWorkerDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 관제 관련 데이터 조회를 위한 MyBatis Mapper 인터페이스
 */
@Mapper
public interface ControlMapper {

    /**
     * 1. 모든 구역의 기본 현황(작업자 수, 상태 등)을 조회
     */
    List<ZoneOverviewDto> selectZoneOverviews();

    /**
     * 2. 특정 구역에 속한 작업자 리스트를 조회
     *
     * @param zoneId 구역 ID
     */
    List<ZoneWorkerDto> selectWorkersByZoneId(@Param("zoneId") Long zoneId);

    /**
     * 3. 현재 시스템 전체의 활성 작업자 수(출근 중인 인원)를 조회
     */
    Integer countTotalActiveWorkers();

    /**
     * 4. 현재 미해결(OPEN) 상태인 이슈 건수를 조회
     */
    Integer countPendingIssues();

    /**
     * 5. 금일 해결(RESOLVED)된 이슈 건수를 조회
     */
    Integer countTodayCompletedIssues();

    /**
     * 6. 작업자 마우스 오버 상세 정보 조회
     *
     * @param workerId 작업자 ID
     */
    WorkerHoverDto selectWorkerHoverInfo(@Param("workerId") Long workerId);

    /**
     * 작업자 존재 여부 확인
     */
    boolean existsWorker(@Param("workerId") Long workerId);

    /**
     * 구역 존재 여부 확인
     */
    boolean existsZone(@Param("zoneId") Long zoneId);

    /**
     * 기존 구역 배정 종료 처리 (ended_at 갱신)
     */
    void closeActiveAssignment(@Param("workerId") Long workerId);

    /**
     * 새로운 구역 배정 이력 생성
     */
    void insertAssignmentHistory(@Param("workerId") Long workerId, @Param("zoneId") Long zoneId,
            @Param("reason") String reason);

    /**
     * 사용자 테이블(Users)의 배정 구역(assigned_zone_id) 업데이트
     */
    /**
     * 사용자 테이블(Users)의 배정 구역(assigned_zone_id) 업데이트
     */
    void updateUserAssignedZone(@Param("workerId") Long workerId, @Param("zoneId") Long zoneId);

    /**
     * 구역 내 모든 라인 조회
     */
    List<ZoneLineDto> selectLinesByZoneId(@Param("zoneId") Long zoneId);

    /**
     * 구역 내 작업자 실시간 위치 및 병목 여부 조회
     */
    List<ZoneWorkerLocationDto> selectWorkerLocationsByZoneId(@Param("zoneId") Long zoneId,
            @Param("thresholdSeconds") int thresholdSeconds);
}
