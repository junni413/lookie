package lookie.backend.domain.issue.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AI 판정 결과 수신 DTO
 * - AI 서버가 이미지 분석 완료 후 POST /api/issues/{issueId}/ai/result로 전송
 * - issueId는 Path Variable로 전달됨
 */
@Data
@NoArgsConstructor
public class AiResultRequest {

    private String aiDecision; // AI 판정 결과: PASS, FAIL, NEED_CHECK, UNKNOWN
    private Float confidence; // 신뢰도 (0.0 ~ 1.0)
    private String summary; // AI 판정 요약 설명 (선택)
    private String aiResult; // AI 원본 응답 JSON (선택)
}
