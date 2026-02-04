package lookie.backend.domain.control.repository.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 관리자 조회용 내부 VO (DB 조회 결과 매핑)
 * DTO와 분리하여 순수 데이터(Raw Data)를 담습니다.
 */
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminQueryVo {
    private Long adminId; // 관리자 ID
    private String rawName; // 원본 이름
    private String phoneNumber; // 전화번호
    private Long assignedZoneId; // 배정된 구역 ID
    private String currentStatus; // 현재 상태
}
