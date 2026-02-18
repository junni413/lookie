package lookie.backend.domain.control.dto.map;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 구역 내 작업자의 실시간 위치 및 상태 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoneWorkerLocationDto {

    /**
     * 작업자 ID
     */
    private Long workerId;

    /**
     * 작업자 이름 (형식: 이름 + 전화번호 뒤 4자리)
     */
    private String name;

    /**
     * 작업자 전화번호 (이름 포맷용, JSON 제외)
     */
    @JsonIgnore
    private String phoneNumber;

    /**
     * 현재 위치 코드 (예: A-01-03)
     */
    private String currentLocationCode;

    /**
     * 병목 현상 발생 여부
     */
    private Boolean isBottleneck;

    /**
     * OPEN 이슈 존재 여부
     */
    private Boolean hasOpenIssue;

    /**
     * 최근 OPEN 이슈 타입 (DAMAGED, OUT_OF_STOCK)
     */
    private String openIssueType;
}
