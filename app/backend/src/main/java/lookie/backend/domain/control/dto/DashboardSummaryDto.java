package lookie.backend.domain.control.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 대시보드 메인 화면을 위한 통합 요약 정보 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDto {
    /** 1. 전체 시스템의 현재 활성(출근 중) 작업자 수 */
    private Integer totalActiveWorkers;
    /** 2. 현재 처리되지 않은(OPEN 상태) 이슈 건수 */
    private Integer pendingIssues;
    /** 3. 금일 해결된(RESOLVED 상태) 이슈 건수 */
    private Integer completedIssues;
    /** 전체 시스템의 평균 작업 진행률 */
    private Double totalProgressRate;
    /** 각 구역별 상세 현황 리스트 */
    private List<ZoneOverviewDto> zoneSummaries;
}
