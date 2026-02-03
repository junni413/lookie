package lookie.backend.domain.control.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.control.dto.ZoneOverviewDto;
import lookie.backend.domain.control.dto.ZoneWorkerDto;
import lookie.backend.domain.control.service.WorkerMonitoringService;
import lookie.backend.global.response.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Control", description = "관제(Control) 관련 API")
@RestController
@RequestMapping("/api/control")
@RequiredArgsConstructor
public class ControlController {

    private final WorkerMonitoringService workerMonitoringService;

    @Operation(summary = "구역별 현황 조회", description = "각 구역(Zone)의 작업자 수와 진행률을 조회합니다.")
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/zones")
    public ApiResponse<List<ZoneOverviewDto>> getZoneOverviews() {
        List<ZoneOverviewDto> result = workerMonitoringService.getZoneOverviews();
        return ApiResponse.success(result);
    }

    @Operation(summary = "구역별 작업자 조회", description = "특정 구역에 배정된 작업자 목록을 조회합니다.")
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/zones/{zoneId}/workers")
    public ApiResponse<List<ZoneWorkerDto>> getWorkersByZone(@PathVariable Long zoneId) {
        List<ZoneWorkerDto> result = workerMonitoringService.getWorkersByZone(zoneId);
        return ApiResponse.success(result);
    }
}
