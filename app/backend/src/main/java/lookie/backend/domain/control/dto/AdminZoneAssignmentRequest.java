package lookie.backend.domain.control.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 관리자 강제 구역 배정 요청 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminZoneAssignmentRequest {

    /**
     * 배정 대상 작업자 ID
     */
    @NotNull(message = "작업자 ID는 필수입니다.")
    private Long workerId;

    /**
     * 배정할 구역 ID
     */
    @NotNull(message = "구역 ID는 필수입니다.")
    private Long zoneId;

    /**
     * 배정 사유 (예: 관리자 강제 배정, 긴급 배치 등)
     * 선택 사항
     */
    private String reason;
}
