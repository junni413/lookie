package lookie.backend.domain.worklog.controller;

import lombok.RequiredArgsConstructor;
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
@RestController
@RequestMapping("/api/work-logs")
@RequiredArgsConstructor
public class WorkLogController {

    private final WorkLogService workLogService;

    /**
     * 1. 출근 처리 API
     * POST /api/work-logs/start
     */
    @PostMapping("/start")
    public ApiResponse<WorkLogResponseDto> startWork(@AuthenticationPrincipal String userId) {
        WorkLogResponseDto response = workLogService.startWork(Long.parseLong(userId));
        return ApiResponse.success("출근 처리가 완료되었습니다.", response);
    }

    /**
     * 2. 퇴근 처리 API
     * POST /api/work-logs/end
     */
    @PostMapping("/end")
    public ApiResponse<WorkLogResponseDto> endWork(@AuthenticationPrincipal String userId) {
        WorkLogResponseDto response = workLogService.endWork(Long.parseLong(userId));
        return ApiResponse.success("퇴근 처리가 완료되었습니다.", response);
    }

    /**
     * 3. 작업 중단(휴식) 요청 API
     * POST /api/work-logs/pause
     */
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
    @PostMapping("/resume")
    public ApiResponse<WorkLogResponseDto> resumeWork(@AuthenticationPrincipal String userId) {
        WorkLogResponseDto response = workLogService.resumeWork(Long.parseLong(userId));
        return ApiResponse.success("작업이 재개되었습니다.", response);
    }

    /**
     * 5. 현재 근무 상태 조회 API (본인용)
     * GET /api/work-logs/current
     */
    @GetMapping("/current")
    public ApiResponse<WorkLogResponseDto> getCurrentStatus(@AuthenticationPrincipal String userId) {
        WorkLogResponseDto response = workLogService.getCurrentStatus(Long.parseLong(userId));
        return ApiResponse.success(response);
    }

    /**
     * 6. 근무 이력 조회 API (본인용)
     * GET /api/work-logs
     */
    @GetMapping
    public ApiResponse<List<WorkLogResponseDto>> getMyWorkHistories(@AuthenticationPrincipal String userId) {
        List<WorkLogResponseDto> response = workLogService.getMyWorkHistories(Long.parseLong(userId));
        return ApiResponse.success(response);
    }
}