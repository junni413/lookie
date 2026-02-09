package lookie.backend.domain.control.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
public class RebalanceApplyRequest {

    private List<ApplyMove> moves;
    private String reason; // 관리자 메모 or AI Recommendation ID 등

    @Data
    @NoArgsConstructor
    public static class ApplyMove {
        private Long workerId;
        private Long toZone;
    }
}
