package lookie.backend.domain.issue.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class CreateIssueRequest {
    private Long batchTaskId;
    private Long batchTaskItemId;
    private String issueType; // 이슈 유형 (DAMAGED, OUT_OF_STOCK)
    private String imageUrl; // 이슈 증빙 이미지 URL
}
