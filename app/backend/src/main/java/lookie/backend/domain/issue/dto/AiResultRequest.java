package lookie.backend.domain.issue.dto;

import lombok.Data;

/**
 * AiResultRequest - AI 판정 결과 수신 DTO (Webhook)
 */
@Data
public class AiResultRequest {
    private String aiDecision; // PASS, FAIL, NEED_CHECK, RETAKE, UNKNOWN
    private String reasonCode; // DAMAGED, MOVE_LOCATION, WAITING_RETURN, STOCK_EXISTS, UNKNOWN, AUTO_RESOLVED

    // 기존 코드 호환성을 위한 필드
    private Double confidence; // AI 신뢰도
    private String summary; // AI 판정 요약
    private String aiResult; // AI 결과 상세 (JSON 등)
    private String newLocation; // MOVE_LOCATION일 때 새 지번 코드
}
