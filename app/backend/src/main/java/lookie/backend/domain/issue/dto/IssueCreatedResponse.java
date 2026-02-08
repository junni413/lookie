package lookie.backend.domain.issue.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lookie.backend.domain.issue.vo.IssueVO;

/**
 * IssueCreatedResponse - 이슈 생성 응답 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueCreatedResponse {
    private Long issueId;
    private IssueVO issue;
    private String workerNextAction; // CONTINUE_PICKING
    private String issueNextAction; // WAIT_AI_RESULT
}
