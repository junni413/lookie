package lookie.backend.domain.control.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 작업자 이동 시뮬레이션 요청 항목
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ZoneMoveRequest {
    private Long workerId;
    private Long toZoneId;
}
