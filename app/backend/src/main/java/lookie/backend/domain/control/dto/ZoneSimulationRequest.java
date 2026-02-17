package lookie.backend.domain.control.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 작업자 이동 시뮬레이션 요청
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ZoneSimulationRequest {
    private List<ZoneMoveRequest> moves;
}
