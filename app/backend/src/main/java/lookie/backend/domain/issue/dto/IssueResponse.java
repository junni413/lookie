package lookie.backend.domain.issue.dto;

import lombok.Builder;
import lombok.Data;
import lookie.backend.domain.issue.vo.IssueVO;

@Data
@Builder
public class IssueResponse {
    private Long issueId;
    private String issueType;
    private String status;
    private Long batchTaskId;
    private Long batchTaskItemId;
    private Integer urgency; // 관제 큐 우선순위
    private String issueHandling;

    public static IssueResponse from(IssueVO issue) {
        return IssueResponse.builder()
                .issueId(issue.getIssueId())
                .issueType(issue.getIssueType())
                .status(issue.getStatus())
                .batchTaskId(issue.getBatchTaskId())
                .batchTaskItemId(issue.getBatchTaskItemId())
                .urgency(issue.getUrgency())
                .issueHandling(issue.getIssueHandling())
                .build();
    }
}
