package lookie.backend.domain.control.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 구역별 현황 요약 정보 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoneOverviewDto {
    /** 구역 ID */
    private Long zoneId;
    /** 구역 이름 */
    private String zoneName;
    /** 구역 활성 작업자 수 */
    private Integer workerCount;
    private Integer openIssueCount;
    /** 구역 진행률(0.0 ~ 100.0) */
    private Double progressRate;
    /** 구역 상태(STABLE, NORMAL, CRITICAL) */
    private String status;
    /** 남은 마감시간(분) */
    private Double remainingDeadlineMinutes;
    /** 예상 완료시간(분) */
    private Double estimatedCompletionMinutes;
}
