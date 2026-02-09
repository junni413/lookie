package lookie.backend.infra.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
// removed unused import

@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class RebalanceRecommendResponse {

    private String ts;

    @JsonProperty("batch_id")
    private Long batchId;

    @JsonProperty("total_risk_before")
    private Double totalRiskBefore;

    @JsonProperty("total_risk_after")
    private Double totalRiskAfter;

    @JsonProperty("total_expected_risk_reduction")
    private Double totalExpectedRiskReduction;

    private List<Move> moves;

    // 그 외 policy, target_zones 등은 필요하면 추가 (현재 MVP에서는 moves만 중요)
}
