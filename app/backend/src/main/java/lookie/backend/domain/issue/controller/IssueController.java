package lookie.backend.domain.issue.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.issue.dto.CreateIssueRequest;
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
}
