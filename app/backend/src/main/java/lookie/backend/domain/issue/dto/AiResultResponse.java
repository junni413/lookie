package lookie.backend.domain.issue.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lookie.backend.domain.issue.vo.IssueVO;

import java.time.LocalDateTime;

/**
 * AI 판정 결과 처리 후 응답 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiResultResponse {

    private Long issueId;
    private String status; // OPEN / RESOLVED
    private Integer urgency; // 관제 큐 우선순위 (0-5)
    private String issueHandling; // BLOCKING / NON_BLOCKING
    private Boolean adminRequired; // 관리자 확인 필요 여부
    private String reasonCode; // 이슈 사유 코드
    private LocalDateTime resolvedAt; // 자동 해결 시각 (PASS 케이스)
    private IssueNextAction nextAction; // 다음 권고 행동

    // AI 상세 정보 추가 (WebSocket 실시간 통보용)
    private String aiResult; // 판정 결과 코드 (PASS, FAIL, NEED_CHECK, RETAKE)
    private String summary; // AI 판정 요약
    private Float confidence; // AI 신뢰도 (0.0 ~ 1.0)
    private String aiDetail; // AI 상세 결과 JSON

    /**
     * IssueVO와 nextAction으로부터 응답 생성
     */
    public static AiResultResponse from(IssueVO issue, IssueNextAction nextAction, String aiResult, String summary,
            Float confidence, String aiDetail) {
        return new AiResultResponse(
                issue.getIssueId(),
                issue.getStatus(),
                issue.getUrgency(),
                issue.getIssueHandling(),
                issue.getAdminRequired(),
                issue.getReasonCode(),
                issue.getResolvedAt(),
                nextAction,
                aiResult,
                summary,
                confidence,
                aiDetail);
    }
}
