package lookie.backend.domain.control.dto.map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 구역 내 라인(컨베이어 벨트 등) 정보 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoneLineDto {

    /**
     * 라인 ID
     */
    private Long lineId;

    /**
     * 라인 이름 (예: Line A, Line B)
     */
    private String lineName;
}
