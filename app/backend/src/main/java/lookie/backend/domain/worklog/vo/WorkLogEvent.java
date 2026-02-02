package lookie.backend.domain.worklog.vo;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkLogEvent {
    private Long eventId;
    private Long workLogId;
    private WorkLogEventType eventType;
    private String reason;
    private LocalDateTime occurredAt;
}