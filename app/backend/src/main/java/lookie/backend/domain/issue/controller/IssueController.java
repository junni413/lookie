package lookie.backend.domain.issue.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.issue.dto.AiResultRequest;
import lookie.backend.domain.issue.dto.AiResultResponse;
import lookie.backend.domain.issue.dto.CreateIssueRequest;
import lookie.backend.domain.issue.dto.IssueDetailResponse;
import lookie.backend.domain.issue.dto.IssueResponse;
import lookie.backend.domain.issue.service.IssueService;
import lookie.backend.global.response.ApiResponse;
import lookie.backend.global.security.SecurityUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Issue(이슈) 도메인 API 컨트롤러
 * - 이슈 생성 (작업자)
 * - AI 판정 결과 수신 (Webhook)
 */
@Slf4j
@Tag(name = "Issue", description = "이슈 관리 API")
@RestController
@RequestMapping("/api/issues")
@RequiredArgsConstructor
public class IssueController {

    private final IssueService issueService;

    /**
     * 이슈 생성
     * - 작업자가 집품 중 문제 발견 시 호출
     */
    @Operation(summary = "이슈 신고", description = "작업자가 집품 중 파손/재고부족 등의 이슈를 신고합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<IssueResponse>> createIssue(@RequestBody CreateIssueRequest request) {
        Long workerId = SecurityUtil.getCurrentUserId();
        IssueResponse response = issueService.createIssue(workerId, request);
        return ResponseEntity.ok(ApiResponse.success("이슈가 등록되었습니다.", response));
    }

    /**
     * 이슈 상세 조회
     * - 작업자가 신고한 이슈의 현재 상태 및 AI 판정 결과 조회
     */
    @Operation(summary = "이슈 상세 조회", description = "이슈 ID로 이슈의 상태, AI 판정 결과, 다음 행동을 조회합니다.")
    @GetMapping("/{issueId}")
    public ResponseEntity<ApiResponse<IssueDetailResponse>> getIssueDetail(
            @Parameter(description = "이슈 ID", required = true) @PathVariable Long issueId) {
        log.info("[IssueController] getIssueDetail called. issueId={}", issueId);

        IssueDetailResponse response = issueService.getIssueDetail(issueId);

        return ResponseEntity.ok(ApiResponse.success("이슈 조회 성공", response));
    }

    /**
     * AI 판정 결과 수신 (Webhook)
     * - AI 서버가 이미지 분석 완료 후 호출 (POST /api/issues/{issueId}/ai/result)
     * - Issue 상태 및 정책 자동 업데이트
     * 
     * [Webhook Contract]
     * - aiDecision: PASS | FAIL | NEED_CHECK | UNKNOWN
     * - confidence: Float (0.0 ~ 1.0)
     */
    @Operation(summary = "AI 판정 결과 수신", description = "AI 서버로부터 이미지 분석 결과를 수신하여 Issue 상태를 업데이트합니다. (Webhook)")
    @PostMapping("/{issueId}/ai/result")
    public ResponseEntity<ApiResponse<AiResultResponse>> receiveAiResult(
            @Parameter(description = "이슈 ID", required = true) @PathVariable Long issueId,
            @RequestBody AiResultRequest request) {
        log.info("[IssueController] AI result received. issueId={}, aiDecision={}",
                issueId, request.getAiDecision());

        AiResultResponse response = issueService.processAiResult(issueId, request);

        return ResponseEntity.ok(ApiResponse.success(
                "AI 판정 결과가 반영되었습니다.",
                response));
    }
}
