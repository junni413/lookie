package lookie.backend.infra.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
// removed unused import

@Data
@Builder
public class SnapshotRow {

    // AI 서버 Schema (src/rebalance/schemas.py) 와 일치해야 함 (snake_case)

    private String ts; // ISO String

    @JsonProperty("batch_id")
    private Long batchId;

    @JsonProperty("worker_id")
    private Long workerId;

    @JsonProperty("zone_id")
    private Long zoneId;

    private BigDecimal progress;

    @JsonProperty("remaining_qty")
    private Integer remainingQty;

    @JsonProperty("time_to_planned_end_min")
    private Integer timeToPlannedEndMin;

    @JsonProperty("time_to_deadline_min")
    private Integer timeToDeadlineMin;

    @JsonProperty("zone_backlog")
    private Integer zoneBacklog;

    @JsonProperty("zone_active_workers")
    private Integer zoneActiveWorkers;

    @JsonProperty("zone_location_cnt")
    private Integer zoneLocationCnt;

    @JsonProperty("zone_blocking_issue_cnt")
    private Integer zoneBlockingIssueCnt;

    @JsonProperty("worker_speed_30m_avg")
    private BigDecimal workerSpeed30mAvg;

    @JsonProperty("speed_label")
    private BigDecimal speedLabel;

    @JsonProperty("picked_total")
    private Integer pickedTotal;

    @JsonProperty("required_total")
    private Integer requiredTotal;
}
