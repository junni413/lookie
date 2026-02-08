package lookie.backend.domain.issue.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.issue.dto.AiResultRequest;
import lookie.backend.domain.issue.dto.AiResultResponse;
import lookie.backend.domain.issue.dto.AdminConfirmRequest;
import lookie.backend.domain.issue.dto.CreateIssueRequest;
import lookie.backend.domain.issue.dto.IssueDetailResponse;
import lookie.backend.domain.issue.dto.IssueResponse;
import lookie.backend.domain.issue.dto.AdminIssueListRequest;
import lookie.backend.domain.issue.dto.AdminIssueListResponse;
import jakarta.validation.Valid;
import lookie.backend.domain.issue.service.IssueService;
import lookie.backend.global.response.ApiResponse;
import lookie.backend.global.security.SecurityUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import lookie.backend.domain.issue.dto.IssueStatus;
import lookie.backend.domain.issue.dto.MyIssueSummary;

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
        private final lookie.backend.domain.issue.service.IssueServiceNew issueServiceNew;

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
         * 이슈 재촬영 (AI 재분석 요청)
         * - AI 판정 결과가 RETAKE일 때, 새 이미지로 재분석을 요청합니다.
         */
        @Operation(summary = "이슈 재촬영 (AI 재분석)", description = "AI 판정 결과가 RETAKE인 경우, 새 이미지 URL로 재분석을 요청합니다.")
        @PostMapping("/{issueId}/ai/retake")
        public ResponseEntity<ApiResponse<Void>> retakeIssue(
                        @Parameter(description = "이슈 ID", required = true) @PathVariable Long issueId,
                        @RequestBody lookie.backend.domain.issue.dto.RetakeIssueRequest request) {

                Long workerId = SecurityUtil.getCurrentUserId();
                issueService.retakeIssue(workerId, issueId, request.getImageUrl());

                return ResponseEntity.ok(ApiResponse.success("재분석 요청이 완료되었습니다.", null));
        }

        /**
         * 이슈 보고용 이미지 등록
         * - 관리자 부재 시, 현장 상황을 기록하기 위해 이미지를 등록합니다. (AI 재분석 X)
         */
        @Operation(summary = "이슈 보고용 이미지 등록", description = "관리자 부재 시 등 현장 상황 기록을 위해 이미지를 등록합니다. (AI 재분석 없음)")
        @PostMapping("/{issueId}/image")
        public ResponseEntity<ApiResponse<Void>> reportImage(
                        @Parameter(description = "이슈 ID", required = true) @PathVariable Long issueId,
                        @RequestBody lookie.backend.domain.issue.dto.ReportImageRequest request) {

                Long workerId = SecurityUtil.getCurrentUserId();
                issueService.reportImage(workerId, issueId, request.getImageUrl());

                return ResponseEntity.ok(ApiResponse.success("이미지가 등록되었습니다.", null));
        }

        /**
         * [FSM] 작업자 다음 아이템 진행
         * - 이슈를 남기고 다음 아이템으로 진행합니다.
         * - NEED_CHECK 정책: 관리자 연결 시도가 필수, 단 MISSED 후에는 허용
         */
        @Operation(summary = "[FSM] 작업자 다음 아이템 진행", description = "이슈를 남기고 다음 아이템으로 진행합니다.")
        @PostMapping("/{issueId}/next-item")
        public ResponseEntity<ApiResponse<Void>> workerChooseNextItem(
                        @PathVariable Long issueId,
                        @RequestParam Long taskId) {

                Long workerId = SecurityUtil.getCurrentUserId();
                issueServiceNew.workerChooseNextItem(workerId, taskId, issueId);

                return ResponseEntity.ok(ApiResponse.success("다음 아이템으로 진행합니다.", null));
        }

        /**
         * [FSM] 관리자 연결 시작
         * - 관리자와 WebRTC 연결을 시작합니다.
         */
        @Operation(summary = "[FSM] 관리자 연결 시작", description = "관리자와 WebRTC 연결을 시작합니다.")
        @PostMapping("/{issueId}/connect-admin")
        public ResponseEntity<ApiResponse<Void>> connectAdmin(@PathVariable Long issueId) {
                issueServiceNew.connectAdmin(issueId);
                return ResponseEntity.ok(ApiResponse.success("관리자 연결을 시작합니다.", null));
        }

        /**
         * [FSM] WebRTC 연결 완료
         * - 관리자와 WebRTC 연결이 완료되었습니다.
         */
        @Operation(summary = "[FSM] WebRTC 연결 완료", description = "관리자와 WebRTC 연결이 완료되었습니다.")
        @PostMapping("/{issueId}/webrtc/connected")
        public ResponseEntity<ApiResponse<Void>> onWebrtcConnected(@PathVariable Long issueId) {
                issueServiceNew.onWebrtcConnected(issueId);
                return ResponseEntity.ok(ApiResponse.success("WebRTC 연결이 완료되었습니다.", null));
        }

        /**
         * [FSM] WebRTC 연결 실패 (부재)
         * - 관리자가 부재하여 연결에 실패했습니다.
         */
        @Operation(summary = "[FSM] WebRTC 연결 실패 (부재)", description = "관리자가 부재하여 연결에 실패했습니다.")
        @PostMapping("/{issueId}/webrtc/missed")
        public ResponseEntity<ApiResponse<Void>> onWebrtcMissed(@PathVariable Long issueId) {
                issueServiceNew.onWebrtcMissed(issueId);
                return ResponseEntity.ok(ApiResponse.success("관리자 부재로 연결이 종료되었습니다.", null));
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

        /**
         * 관리자 확정 (ADMIN_CONFIRM)
         * - 분기표 D14: DAMAGED 확정 (NORMAL/DAMAGED/CALLED_OTHER_PROCESS)
         * - 분기표 S7: OUT_OF_STOCK 확정 (FIXED)
         */
        @Operation(summary = "관리자 확정", description = "관리자가 이슈를 최종 확정 처리합니다. (WebRTC 통화 후 또는 사후 확정)")
        @PostMapping("/{issueId}/admin/confirm")
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<ApiResponse<Void>> confirmIssue(
                        @Parameter(description = "이슈 ID", required = true) @PathVariable Long issueId,
                        @RequestBody AdminConfirmRequest request) {
                // 관리자 권한 체크: @PreAuthorize("hasRole('ADMIN')") 적용됨
                log.info("[IssueController] Admin confirm request. issueId={}, decision={}",
                                issueId, request.getAdminDecision());

                // String을 AdminDecision enum으로 변환
                issueServiceNew.adminConfirm(issueId, request.getAdminDecision());

                return ResponseEntity.ok(ApiResponse.success(
                                "이슈가 확정 처리되었습니다.",
                                null));
        }

        /**
         * 내 이슈 목록 조회
         * - 작업자 본인이 등록한 이슈 목록 조회
         * - status (OPEN/RESOLVED) 필터링 가능
         */
        @Operation(summary = "내 이슈 목록 조회", description = "로그인한 작업자의 이슈 목록을 조회합니다.")
        @GetMapping("/my")
        public ResponseEntity<ApiResponse<List<MyIssueSummary>>> getMyIssues(
                        @Parameter(description = "이슈 상태 (OPEN, RESOLVED)") @RequestParam(required = false) IssueStatus status) {
                Long workerId = SecurityUtil.getCurrentUserId();
                List<MyIssueSummary> response = issueService
                                .getMyIssueList(workerId, status);
                return ResponseEntity.ok(ApiResponse.success("내 이슈 목록 조회 성공", response));
        }

        /**
         * 관리자 관제 이슈 목록 조회
         * - 관리자 담당 Zone의 이슈 목록을 조회합니다.
         */
        @Operation(summary = "관리자 관제 이슈 목록 조회", description = "관리자 담당 Zone의 이슈 목록을 조회합니다.")
        @GetMapping
        @PreAuthorize("hasRole('ADMIN')")
        public ResponseEntity<ApiResponse<AdminIssueListResponse>> getIssues(
                        @Parameter(description = "검색 조건") @ModelAttribute @Valid AdminIssueListRequest request) {

                Long adminId = SecurityUtil.getCurrentUserId();
                AdminIssueListResponse response = issueService.getAdminIssueList(adminId, request);

                return ResponseEntity.ok(ApiResponse.success("이슈 목록 조회 성공", response));
        }
}
