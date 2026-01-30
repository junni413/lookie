package lookie.backend.domain.task.vo;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Alias("TaskVO")
public class TaskVO {
    private Long batchTaskId;
    private Long batchId;
    private Long zoneId;

    private Long workerId; // nullable
    private Long toteId;
    private String status; // UNASSIGNED / IN_PROGRESS / COMPLETED

    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    private LocalDateTime toteScannedAt;
    private LocalDateTime toteReleasedAt;

    private TaskActionStatus actionStatus; // SCAN_TOTE / SCAN_LOCATION / SCAN_ITEM / COMPLETE_TASK
    private LocalDateTime locationScannedAt; // 지번 스캔 완료 시각
}
