package lookie.backend.infra.ai.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class RebalanceRecommendRequest {
    private List<SnapshotRow> rows;
}
