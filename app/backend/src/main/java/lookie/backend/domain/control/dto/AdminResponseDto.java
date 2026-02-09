package lookie.backend.domain.control.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 관리자(ADMIN) 검색 응답을 위한 DTO
 */
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminResponseDto {
    private Long adminId; // 관리자 ID
    private String name; // 관리자 실명 (포맷팅 없음)
    private Long assignedZoneId; // 배정된 구역 ID
    private String zoneName; // 구역 이름 (ZoneType 매핑)
    private String currentStatus; // 현재 상태 (START, PAUSE, RESUME, END)
}
