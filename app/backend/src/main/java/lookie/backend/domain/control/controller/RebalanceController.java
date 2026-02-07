package lookie.backend.domain.control.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.control.dto.RebalanceApplyRequest;
import lookie.backend.domain.control.service.RebalanceService;
import lookie.backend.global.response.ApiResponse;
import lookie.backend.infra.ai.dto.RebalanceRecommendResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Rebalance", description = "AI 기반 인력 재배치 API")
@RestController
@RequestMapping("/api/rebalance")
@RequiredArgsConstructor
public class RebalanceController {

    private final RebalanceService rebalanceService;

    @Operation(summary = "AI 재배치 추천 조회", description = "현재 진행 중인 배치의 최신 현황을 기반으로 AI 추천을 받습니다.")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/recommend")
    public ApiResponse<RebalanceRecommendResponse> recommend() {
        RebalanceRecommendResponse response = rebalanceService.recommend();
        return ApiResponse.success(response);
    }

    @Operation(summary = "AI 재배치 적용", description = "AI가 추천한 재배치(또는 관리자가 조정한 결과)를 시스템에 반영합니다.")
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/apply")
    public ApiResponse<Void> apply(@RequestBody RebalanceApplyRequest request) {
        rebalanceService.apply(request);
        return ApiResponse.success(null);
    }
}
