package lookie.backend.domain.batch.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

@Getter
@Builder
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class BatchVO {
    private Long batchId;
    private Integer batchRound;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime deadlineAt;
    private String status; // IN_PROGRESS, COMPLETED
    private LocalDateTime createdAt;
}
