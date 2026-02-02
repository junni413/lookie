package lookie.backend.domain.issue.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lookie.backend.domain.issue.vo.AiJudgmentVO;
import lookie.backend.domain.issue.vo.IssueVO;

import java.util.List;

/**
 * 이슈 상세 조회 응답 DTO
 * Issue 기본 정보 + AI 판정 결과 + 계산 필드를 포함
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueDetailResponse {

    // Issue 기본 정보
    private Long issueId;
    private String type; // issueType → type으로 매핑
    private String status; // OPEN / RESOLVED
    private String priority; // LOW / MEDIUM / HIGH
    private String issueHandling; // BLOCKING / NON_BLOCKING
    private Boolean adminRequired; // 관리자 확인 필요 여부
    private String reasonCode; // 이슈 사유 코드

    // AI 판정 결과 (ai_judgments 테이블)
    private String aiResult; // aiDecision → aiResult로 매핑
    private Float confidence; // AI 신뢰도 (0.0 ~ 1.0)
    private String summary; // AI 판정 요약

    // 계산 필드 (DB 저장 X)
    private List<String> availableActions; // UI 힌트용 가능한 액션 목록
    private String nextAction; // 다음 권고 행동

    /**
     * IssueVO, AiJudgmentVO, 계산 필드로부터 응답 DTO 생성
     */
    public static IssueDetailResponse from(IssueVO issue, AiJudgmentVO judgment,
            String nextAction, List<String> availableActions) {
        return IssueDetailResponse.builder()
                .issueId(issue.getIssueId())
                .type(issue.getIssueType())
                .status(issue.getStatus())
                .priority(issue.getPriority())
                .issueHandling(issue.getIssueHandling())
                .adminRequired(issue.getAdminRequired())
                .reasonCode(issue.getReasonCode())
                .aiResult(judgment != null ? judgment.getAiDecision() : null)
                .confidence(judgment != null ? judgment.getConfidence() : null)
                .summary(judgment != null ? judgment.getSummary() : null)
                .availableActions(availableActions)
                .nextAction(nextAction)
                .build();
    }
}
