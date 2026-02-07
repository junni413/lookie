package lookie.backend.domain.control.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RebalanceSnapshotVO {
    private LocalDateTime ts;
    private Long batchId;
    private Long workerId;
    private Long zoneId;

    private BigDecimal progress;
    private Integer remainingQty;

    private Integer timeToPlannedEndMin;
    private Integer timeToDeadlineMin;

    private Integer zoneBacklog;
    private Integer zoneActiveWorkers;
    private Integer zoneLocationCnt;
    private Integer zoneBlockingIssueCnt;

    private BigDecimal workerSpeed30mAvg;
    private BigDecimal speedLabel;

    private Integer pickedTotal;
    private Integer requiredTotal;

    private LocalDateTime createdAt;
}
