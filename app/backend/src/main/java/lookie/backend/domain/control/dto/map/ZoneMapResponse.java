package lookie.backend.domain.control.dto.map;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 구역 상세 맵 데이터 응답 DTO
 * (그리드 맵 렌더링 및 실시간 위치 표시)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoneMapResponse {

    /**
     * 구역 ID
     */
    private Long zoneId;

    /**
     * 구역 이름 (예: ZONE A)
     */
    private String zoneName;

    /**
     * 구역 내 라인 목록
     */
    private List<ZoneLineDto> lines;

    /**
     * 구역 내 작업자 실시간 위치 목록
     */
    private List<ZoneWorkerLocationDto> workers;
}
