package lookie.backend.domain.issue.dto;

import lombok.Data;

/**
 * CreateIssueRequest - 이슈 생성 요청 DTO (FSM 기준)
 * 
 * FSM 가이드:
 * - 이슈 생성 시점에는 이미지가 없음 (나중에 별도 업로드)
 * - taskId, taskItemId, issueType만 필수
 */
@Data
public class CreateIssueRequest {
    private Long taskId; // 작업 ID
    private Long taskItemId; // 작업 아이템 ID (nullable: OOS는 아이템 없이 생성 가능)
    private String issueType; // DAMAGED or OUT_OF_STOCK
    private String imageUrl; // DAMAGED 필수, OUT_OF_STOCK 없음
}
