package lookie.backend.infra.ai.dto;

import lombok.Builder;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@Data
@Builder
public class RebalanceRecommendRequest {
    private List<SnapshotRow> rows;
    private List<MoveInput> moves;

    @Data
    @Builder
    public static class MoveInput {
        @JsonProperty("worker_id")
        private Long workerId;

        @JsonProperty("to_zone")
        private Long toZone;
    }
}
