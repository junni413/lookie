package lookie.backend.domain.issue.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lookie.backend.domain.issue.vo.AiJudgmentVO;
import lookie.backend.domain.issue.vo.IssueVO;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Issue Domain DTOs
 * Consolidates all issue-related request/response objects
 */
public class IssueDto {

    /**
     * 이슈 생성 요청 DTO (FSM 기준)
     * 
     * FSM 가이드:
     * - 이슈 생성 시점에는 이미지가 없음 (나중에 별도 업로드)
     * - taskId, taskItemId, issueType만 필수
     */
    @Data
    public static class CreateRequest {
        private Long taskId; // 작업 ID
        private Long taskItemId; // 작업 아이템 ID (nullable: OOS는 아이템 없이 생성 가능)
        private String issueType; // DAMAGED or OUT_OF_STOCK
        private String imageUrl; // DAMAGED 필수, OUT_OF_STOCK 없음
    }

    /**
     * AI 판정 결과 수신 DTO (Webhook)
     */
    @Data
    public static class AiResultRequest {
        private String aiDecision; // PASS, FAIL, NEED_CHECK, RETAKE, UNKNOWN
        private String reasonCode; // DAMAGED, MOVE_LOCATION, WAITING_RETURN, STOCK_EXISTS, UNKNOWN, AUTO_RESOLVED

        // 기존 코드 호환성을 위한 필드
        private Double confidence; // AI 신뢰도
        private String summary; // AI 판정 요약
        private String aiResult; // AI 결과 상세 (JSON 등)
        private String newLocation; // MOVE_LOCATION일 때 새 지번 코드
    }

    /**
     * 관리자 확정 요청 DTO
     */
    @Data
    public static class AdminConfirmRequest {
        private String decision; // NORMAL, DAMAGED, CALLED_OTHER_PROCESS, FIXED

        // 기존 코드 호환성을 위한 필드 (alias)
        private String adminDecision; // decision과 동일 (alias)

        public String getAdminDecision() {
            return adminDecision != null ? adminDecision : decision;
        }
    }

    /**
     * 보고용 이미지 등록 요청 DTO
     */
    @Data
    @NoArgsConstructor
    public static class ReportImageRequest {
        private String imageUrl;
    }

    /**
     * 재촬영 요청 DTO
     */
    @Data
    @NoArgsConstructor
    public static class RetakeRequest {
        private String imageUrl; // 재촬영된 이미지 URL
    }

    /**
     * 관리자 이슈 목록 조회 요청 DTO
     */
    @Getter
    @Setter
    public static class AdminIssueListRequest {
        @NotNull(message = "Status is required (OPEN or RESOLVED)")
        @Schema(description = "이슈 상태 (OPEN: 대기, RESOLVED: 완료)", example = "OPEN")
        private IssueStatus status;

        @Schema(description = "페이지 번호 (1부터 시작)", defaultValue = "1")
        private int page = 1;

        @Schema(description = "페이지 크기", defaultValue = "10")
        private int size = 10;

        @Schema(description = "정렬 방식 (LATEST: 최신순, URGENCY: 긴급도순)", defaultValue = "LATEST")
        private IssueSortType sortType = IssueSortType.LATEST;

        // Offset calculation for MyBatis
        public int getOffset() {
            return (page - 1) * size;
        }
    }

    /**
     * 이슈 응답 DTO
     */
    @Data
    @Builder
    public static class Response {
        private Long issueId;
        private String issueType;
        private String status;
        private Long batchTaskId;
        private Long batchTaskItemId;
        private Integer urgency; // 관제 큐 우선순위
        private String issueHandling;

        public static Response from(IssueVO issue) {
            return Response.builder()
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

    /**
     * 이슈 생성 응답 DTO
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreatedResponse {
        private Long issueId;
        private IssueVO issue;
        private String workerNextAction; // CONTINUE_PICKING
        private String issueNextAction; // WAIT_AI_RESULT
    }

    /**
     * 이슈 상세 조회 응답 DTO
     * Issue 기본 정보 + AI 판정 결과 + 계산 필드를 포함
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetailResponse {

        // Issue 기본 정보
        private Long issueId;
        private String type; // issueType → type으로 매핑
        private String status; // OPEN / RESOLVED
        private String priority; // LOW / MEDIUM / HIGH (사용 중단 예정)
        private String issueHandling; // BLOCKING / NON_BLOCKING
        private Boolean adminRequired; // 관리자 확인 필요 여부
        private String reasonCode; // 이슈 사유 코드

        // 신규 정책 필드 (분기표 기준)
        private Integer urgency; // 관제 큐 우선순위 (0-5)
        private String adminDecision; // 관리자 확정 결과

        // AI 판정 결과 (ai_judgments 테이블)
        private String aiResult; // 판정 결과 코드 (PASS, FAIL, NEED_CHECK, RETAKE)
        private String aiDetail; // AI 상세 결과 JSON (좌표 정보 포함)
        private Float confidence; // AI 신뢰도 (0.0 ~ 1.0)
        private String summary; // AI 판정 요약
        private String imageUrl; // 이슈 증빙 이미지 URL

        // 계산 필드 (DB 저장 X)
        private String workerNextAction; // 작업자 다음 행동
        private String issueNextAction; // 이슈 다음 행동 (기존 nextAction)
        private String adminNextAction; // 관리자 다음 행동
        private List<String> availableActions; // UI 힌트용 가능한 액션 목록

        /**
         * IssueVO, AiJudgmentVO, 계산 필드로부터 응답 DTO 생성
         */
        public static DetailResponse from(IssueVO issue, AiJudgmentVO judgment,
                String workerNextAction, String issueNextAction, String adminNextAction,
                List<String> availableActions) {
            return DetailResponse.builder()
                    .issueId(issue.getIssueId())
                    .type(issue.getIssueType())
                    .status(issue.getStatus())
                    .status(issue.getStatus())
                    // .priority(issue.getPriority()) // 삭제됨
                    .issueHandling(issue.getIssueHandling())
                    .adminRequired(issue.getAdminRequired())
                    .reasonCode(issue.getReasonCode())
                    .urgency(issue.getUrgency())
                    .adminDecision(issue.getAdminDecision())
                    .aiResult(judgment != null ? judgment.getAiDecision() : null)
                    .aiDetail(judgment != null ? judgment.getAiResult() : null)
                    .confidence(judgment != null ? judgment.getConfidence() : null)
                    .summary(judgment != null ? judgment.getSummary() : null)
                    .imageUrl(judgment != null ? judgment.getImageUrl() : null)
                    .workerNextAction(workerNextAction)
                    .issueNextAction(issueNextAction)
                    .adminNextAction(adminNextAction)
                    .availableActions(availableActions)
                    .build();
        }
    }

    /**
     * AI 판정 결과 처리 후 응답 DTO
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiResultResponse {

        private Long issueId;
        private String status; // OPEN / RESOLVED
        private Integer urgency; // 관제 큐 우선순위 (0-5)
        private String issueHandling; // BLOCKING / NON_BLOCKING
        private Boolean adminRequired; // 관리자 확인 필요 여부
        private String reasonCode; // 이슈 사유 코드
        private LocalDateTime resolvedAt; // 자동 해결 시각 (PASS 케이스)
        private String issueNextAction; // 다음 권고 행동 (Renamed from nextAction)
        private List<String> availableActions; // UI 힌트용 가능한 액션 목록

        // AI 상세 정보 추가 (WebSocket 실시간 통보용)
        private String aiResult; // 판정 결과 코드 (PASS, FAIL, NEED_CHECK, RETAKE)
        private String summary; // AI 판정 요약
        private Float confidence; // AI 신뢰도 (0.0 ~ 1.0)
        private String aiDetail; // AI 상세 결과 JSON
        private String imageUrl; // 이슈 이미지 URL

        /**
         * IssueVO와 nextAction으로부터 응답 생성
         */
        public static AiResultResponse from(IssueVO issue, String issueNextAction,
                List<String> availableActions, String aiResult, String summary,
                Float confidence, String aiDetail, String imageUrl) {
            return new AiResultResponse(
                    issue.getIssueId(),
                    issue.getStatus(),
                    issue.getUrgency(),
                    issue.getIssueHandling(),
                    issue.getAdminRequired(),
                    issue.getReasonCode(),
                    issue.getResolvedAt(),
                    issueNextAction,
                    availableActions,
                    aiResult,
                    summary,
                    confidence,
                    aiDetail,
                    imageUrl);
        }
    }

    /**
     * 관리자 이슈 목록 응답 DTO
     */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminIssueListResponse {
        private List<AdminIssueSummary> issues;
        private PaginationInfo paging;

        @Getter
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class PaginationInfo {
            private int page;
            private int size;
            private long totalCount;
            private int totalPages;
        }

        public static AdminIssueListResponse of(List<AdminIssueSummary> issues, int page, int size, long totalCount) {
            int totalPages = (int) Math.ceil((double) totalCount / size);
            return AdminIssueListResponse.builder()
                    .issues(issues)
                    .paging(PaginationInfo.builder()
                            .page(page)
                            .size(size)
                            .totalCount(totalCount)
                            .totalPages(totalPages)
                            .build())
                    .build();
        }
    }

    /**
     * 내 이슈 요약 DTO
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MyIssueSummary {
        private Long issueId;
        private String issueType;
        private String status;
        private String productName;
        private String locationCode;
        private String aiDecision;
        private Boolean adminRequired;
        private LocalDateTime createdAt;
    }

    /**
     * 관리자 이슈 요약 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminIssueSummary {
        private Long issueId;
        private String issueType; // DAMAGED, OUT_OF_STOCK
        private String status; // OPEN, RESOLVED
        private Integer urgency; // 1(High) ~ 5(Low)
        private String aiDecision; // Latest AI Judgment
        private String adminDecision; // Only for RESOLVED

        // Worker Info
        private Long workerId;
        private String workerName;

        // Product Info
        private String productName;

        // Location Info
        private String locationCode; // e.g. "A-01-02"

        private LocalDateTime createdAt;
        private LocalDateTime resolvedAt;
    }
}
