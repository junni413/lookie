package lookie.backend.domain.control.mapper;

import java.util.List;
import lookie.backend.domain.control.dto.ZoneOverviewDto;
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
}
