package lookie.backend.domain.worklog.vo;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkLog {
    private Long workLogId;
    private Long workerId;
    private LocalDateTime startedAt;
    private LocalDateTime plannedEndAt;
    private LocalDateTime endedAt;
}