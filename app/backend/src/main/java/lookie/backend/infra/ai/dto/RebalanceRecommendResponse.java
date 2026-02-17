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

    @JsonProperty("zone_risks")
    private List<ZoneRiskInfo> zoneRisks;

    private List<Move> moves;

    // policy, target_zones are ignored for now (MVP keeps moves only)

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ZoneRiskInfo {
        @JsonProperty("zone_id")
        private Long zoneId;

        private Double backlog;

        @JsonProperty("deadline_min")
        private Double deadlineMin;

        private Integer block;

        @JsonProperty("capacity_h_before")
        private Double capacityHBefore;

        @JsonProperty("capacity_h_after")
        private Double capacityHAfter;

        @JsonProperty("risk_before")
        private Double riskBefore;

        @JsonProperty("risk_after")
        private Double riskAfter;

        @JsonProperty("risk_reduction")
        private Double riskReduction;
    }
}


