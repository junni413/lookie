package lookie.backend.domain.control.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import lookie.backend.domain.control.dto.AdminZoneAssignmentRequest;
import lookie.backend.domain.control.dto.DashboardSummaryDto;
import lookie.backend.domain.control.dto.WorkerHoverDto;
import lookie.backend.domain.control.dto.ZoneOverviewDto;
import lookie.backend.domain.control.dto.ZoneWorkerDto;
import lookie.backend.domain.control.dto.map.ZoneMapResponse;
import lookie.backend.domain.control.service.WorkerLocationService;
import lookie.backend.domain.control.service.WorkerMonitoringService;
import lookie.backend.global.response.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 현장 관제(Control Map) 관련 API 컨트롤러
 * 관리자(ADMIN) 전용이며, 구역별 현황, 작업자 조회, 대시보드 요약 정보를 제공합니다.
 */
@Tag(name = "Control", description = "관제(Control) 관련 API")
@RestController
@RequestMapping("/api/control")
@RequiredArgsConstructor
public class ControlController {

    private final WorkerMonitoringService workerMonitoringService;
    private final WorkerLocationService workerLocationService;

    /**
     * 1. 구역별 현황 조회 API
     * 각 구역(Zone)의 현재 작업자 인원 수와 진행률 조회
     * 권한: ADMIN
     */
    @Operation(summary = "구역별 현황 조회", description = "각 구역(Zone)의 작업자 수와 진행률을 조회합니다.")
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/zones")
    public ApiResponse<List<ZoneOverviewDto>> getZoneOverviews() {
        List<ZoneOverviewDto> result = workerMonitoringService.getZoneOverviews();
        return ApiResponse.success(result);
    }

    /**
     * 2. 구역별 작업자 상세 조회 API
     * 특정 구역 ID에 해당하는 작업자들의 목록(이름, 작업량, 상태 등)을 조회
     * 권한: ADMIN
     */
    @Operation(summary = "구역별 작업자 조회", description = "특정 구역에 배정된 작업자 목록을 조회합니다.")
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/zones/{zoneId}/workers")
    public ApiResponse<List<ZoneWorkerDto>> getWorkersByZone(@PathVariable Long zoneId) {
        List<ZoneWorkerDto> result = workerMonitoringService.getWorkersByZone(zoneId);
        return ApiResponse.success(result);
    }

    /**
     * 3. 대시보드 통합 요약 조회 API
     * 관제 화면 상단에 표시될 시스템 전체 통계(활성 작업자 수, 이슈 건수 등)와 구역별 현황을 한 번에 반환
     * 권한: ADMIN
     */
    @Operation(summary = "대시보드 요약 조회", description = "전체 작업자 수, 이슈 현황, 구역별 요약 정보를 조회합니다.")
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/summary")
    public ApiResponse<DashboardSummaryDto> getDashboardSummary() {
        DashboardSummaryDto result = workerMonitoringService.getDashboardSummary();
        return ApiResponse.success(result);
    }

    /**
     * 4. 작업자 호버 정보 조회 API
     * 관제 맵에서 작업자 마우스 오버 시 표시될 요약 정보(위치, 작업량, 이슈)를 반환
     * 권한: ADMIN
     */
    @Operation(summary = "작업자 호버 정보 조회", description = "작업자 마우스 오버 시 필요한 요약 정보를 조회합니다.")
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/workers/{workerId}/hover")
    public ApiResponse<WorkerHoverDto> getWorkerHoverInfo(@PathVariable Long workerId) {
        WorkerHoverDto result = workerMonitoringService.getWorkerHoverInfo(workerId);
        return ApiResponse.success(result);
    }

    /**
     * 5. 관리자 강제 구역 배정 API
     * 특정 작업자를 지정된 구역으로 강제 이동(배정)시킵니다.
     * 권한: ADMIN
     */
    @Operation(summary = "관리자 강제 구역 배정", description = "작업자를 특정 구역으로 강제 배정합니다.")
    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/assignments")
    public ApiResponse<Void> assignWorkerToZone(@RequestBody @Valid AdminZoneAssignmentRequest request) {
        workerMonitoringService.assignWorkerToZone(request);
        return ApiResponse.success(null); // 중복된 return 제거됨
    }

    /**
     * 6. 구역 상세 맵 조회 API
     * 구역 내 라인 및 작업자 실시간 위치(병목 여부 포함)를 반환
     * 권한: ADMIN
     */
    @Operation(summary = "구역 상세 맵 조회", description = "구역 내 라인 및 작업자 실시간 위치 정보를 조회합니다.")
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/zones/{zoneId}/map")
    public ApiResponse<ZoneMapResponse> getZoneMap(@PathVariable Long zoneId) {
        ZoneMapResponse result = workerLocationService.getZoneMap(zoneId);
        return ApiResponse.success(result);
    }
}