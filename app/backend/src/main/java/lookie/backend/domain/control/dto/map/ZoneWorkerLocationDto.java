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
     * 작업자 이름 (형식: 이름 + 전화번호 뒷 4자리)
     */
    private String name;

    /**
     * 작업자 전화번호 (이름 포맷팅용, JSON 제외)
     */
    @JsonIgnore
    private String phoneNumber;

    /**
     * 현재 위치 코드 (예: A-01-03)
     */
    private String currentLocationCode;

    /**
     * 병목 현상 발생 여부
     * (현재 작업 시간이 임계값을 초과했는지 여부)
     */
    private Boolean isBottleneck;
}
