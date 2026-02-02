package lookie.backend.domain.worklog.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.worklog.dto.DailyWorkLogStats;
import lookie.backend.domain.worklog.dto.WorkLogRequestDto;
import lookie.backend.domain.worklog.dto.WorkLogResponseDto;
import lookie.backend.domain.worklog.service.WorkLogService;
import lookie.backend.global.response.ApiResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 작업자의 근무 관리(출근, 퇴근, 상태 변경) 담당 API 컨트롤러
 */
@Tag(name = "WorkLog", description = "근무 관리 API (출근/퇴근/휴식/재개/이력)")
@RestController
@RequestMapping("/api/work-logs")
@RequiredArgsConstructor
public class WorkLogController {

    private final WorkLogService workLogService;

    /**
     * 1. 출근 처리 API
     * POST /api/work-logs/start
     */
    @Operation(summary = "출근 처리", description = "새로운 근무 세션을 시작합니다 (이미 출근 중이면 에러 반환)")
    @PostMapping("/start")
    public ApiResponse<WorkLogResponseDto> startWork(@AuthenticationPrincipal String userId) {
        WorkLogResponseDto response = workLogService.startWork(Long.parseLong(userId));
        return ApiResponse.success("출근 처리가 완료되었습니다.", response);
    }

    /**
     * 2. 퇴근 처리 API
     * POST /api/work-logs/end
     */
    @Operation(summary = "퇴근 처리", description = "현재 진행 중인 근무 세션을 종료합니다")
    @PostMapping("/end")
    public ApiResponse<WorkLogResponseDto> endWork(@AuthenticationPrincipal String userId) {
        WorkLogResponseDto response = workLogService.endWork(Long.parseLong(userId));
        return ApiResponse.success("퇴근 처리가 완료되었습니다.", response);
    }

    /**
     * 3. 작업 중단(휴식) 요청 API
     * POST /api/work-logs/pause
     */
    @Operation(summary = "작업 중단(휴식) 요청", description = "근무 상태를 휴식(PAUSE)으로 변경합니다 (사유 입력 필수)")
    @PostMapping("/pause")
    public ApiResponse<WorkLogResponseDto> pauseWork(
            @AuthenticationPrincipal String userId,
            @RequestBody WorkLogRequestDto.StatusChange request) {
        WorkLogResponseDto response = workLogService.pauseWork(Long.parseLong(userId), request);
        return ApiResponse.success("휴식 상태로 변경되었습니다.", response);
    }

    /**
     * 4. 작업 재개 요청 API
     * POST /api/work-logs/resume
     */
    @Operation(summary = "작업 재개 요청", description = "휴식 상태인 작업을 다시 근무 상태(RESUME)로 변경합니다")
    @PostMapping("/resume")
    public ApiResponse<WorkLogResponseDto> resumeWork(@AuthenticationPrincipal String userId) {
        WorkLogResponseDto response = workLogService.resumeWork(Long.parseLong(userId));
        return ApiResponse.success("작업이 재개되었습니다.", response);
    }

    /**
     * 5. 현재 근무 상태 조회 API (본인용)
     * GET /api/work-logs/current
     */
    @Operation(summary = "현재 근무 상태 조회", description = "현재 로그인한 작업자의 최신 근무 상태(출근 여부, 휴식 여부 등)를 조회합니다")
    @GetMapping("/current")
    public ApiResponse<WorkLogResponseDto> getCurrentStatus(@AuthenticationPrincipal String userId) {
        WorkLogResponseDto response = workLogService.getCurrentStatus(Long.parseLong(userId));
        return ApiResponse.success(response);
    }

    /**
     * 6. 근무 이력 조회 API (본인용)
     * GET /api/work-logs
     */
    @Operation(summary = "근무 이력 조회 (전체 리스트)", description = "본인의 모든 근무 상세 이력을 최신순으로 조회합니다")
    @GetMapping
    public ApiResponse<List<WorkLogResponseDto>> getMyWorkHistories(@AuthenticationPrincipal String userId) {
        List<WorkLogResponseDto> response = workLogService.getMyWorkHistories(Long.parseLong(userId));
        return ApiResponse.success(response);
    }

    /**
     * 7. 근무 이력 통계 조회 API (본인용 - Calendar Stats)
     * GET /api/work-logs/stats
     */
    @Operation(summary = "근무 이력 통계 조회 (캘린더용)", description = "일별 총 근무 시간(시/분)을 집계하여 조회합니다 (캘린더 렌더링용)")
    @GetMapping("/stats")
    public ApiResponse<List<DailyWorkLogStats>> getWorkLogStats(@AuthenticationPrincipal String userId) {
        List<DailyWorkLogStats> response = workLogService.getDailyStats(Long.parseLong(userId));
        return ApiResponse.success(response);
    }
}