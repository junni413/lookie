package lookie.backend.domain.control.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 구역별 현황 요약 정보를 담는 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoneOverviewDto {
    /** 1. 구역 ID (DB PK) */
    private Long zoneId;
    /** 2. 구역 이름 (Enum 매핑된 표시용 이름, 예: ZONE A) */
    private String zoneName;
    /** 3. 해당 구역의 현재 활성 작업자 수 */
    private Integer workerCount;
    /** 4. 구역의 전체 작업 진행률 (0.0 ~ 100.0) */
    private Double progressRate;
    /** 5. 구역 상태 (STABLE, WARNING 등) */
    private String status;
}
