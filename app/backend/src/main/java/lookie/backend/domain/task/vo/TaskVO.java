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
}
