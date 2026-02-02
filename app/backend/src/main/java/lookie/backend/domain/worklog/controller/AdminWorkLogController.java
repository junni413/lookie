package lookie.backend.domain.worklog.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.worklog.dto.WorkLogResponseDto;
import lookie.backend.domain.worklog.service.WorkLogService;
import lookie.backend.global.response.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * 관리자/관제용 근무 관리 API 컨트롤러
 * - 권한: ADMIN 전용
 * - 역할: 전체 작업자 모니터링(Map) 및 특정 작업자 상세 상태 조회
 */
@Tag(name = "WorkLog (Admin)", description = "관리자/관제용 근무 관리 API (관제 맵/상세 모니터링)")
@RestController
@RequestMapping("/api/admin/work-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')") // 관리자 권한 강제
public class AdminWorkLogController {

    private final WorkLogService workLogService;

    /**
     * 1. 현재 근무자 전체 목록 조회 API (관제 맵용)
     * GET /api/admin/work-logs/active
     */
    @Operation(summary = "현재 근무자 전체 목록 조회 (관제 맵)",
            description = "현재 퇴근하지 않은(Active) 모든 작업자의 목록을 조회합니다. <br>" +
                    "실시간 위치(지번, 라인) 정보가 포함되며, 성과 데이터는 최적화를 위해 제외됩니다.")
    @GetMapping("/active")
    public ApiResponse<List<WorkLogResponseDto>> getActiveWorkers() {
        return ApiResponse.success(workLogService.getActiveWorkers());
    }

    /**
     * 2. 특정 작업자 현재 상태 조회 API (상세 화면 Polling용)
     * GET /api/admin/work-logs/current?workerId={id}
     */
    @Operation(summary = "특정 작업자 현재 상태 조회 (상세 화면 Polling)",
            description = "특정 작업자의 실시간 상태(근무중/휴식/종료)를 조회합니다. <br>" +
                    "관리자 페이지의 작업자 상세 모달에서 상태 아이콘 갱신을 위해 주기적으로 호출합니다.")
    @GetMapping("/current")
    public ApiResponse<WorkLogResponseDto> getWorkerCurrentStatus(
            @Parameter(description = "조회할 작업자의 ID", required = true)
            @RequestParam Long workerId) {

        // 관리자(Admin)가 조회하므로 loginId는 0L(시스템)로 처리하고,
        // 실제 조회 대상인 workerId를 targetWorkerId로 전달합니다.
        WorkLogResponseDto response = workLogService.getCurrentStatus(0L, workerId);
        return ApiResponse.success(response);
    }

    /**
     * 3. 특정 작업자 근무 이력 조회 API
     * GET /api/admin/work-logs?workerId={id}
     */
    @Operation(summary = "특정 작업자 근무 이력 조회",
            description = "특정 작업자의 과거 모든 근무 상세 이력을 최신순으로 조회합니다.")
    @GetMapping
    public ApiResponse<List<WorkLogResponseDto>> getWorkerHistories(
            @Parameter(description = "조회할 작업자의 ID", required = true)
            @RequestParam Long workerId) {

        // 관리자(Admin)가 조회하므로 loginId는 0L, 조회 대상 workerId 전달
        List<WorkLogResponseDto> response = workLogService.getWorkHistories(0L, workerId);
        return ApiResponse.success(response);
    }
}