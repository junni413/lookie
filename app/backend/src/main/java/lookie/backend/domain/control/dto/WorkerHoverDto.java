package lookie.backend.domain.control.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 관리자 관제 맵에서 작업자 마우스 오버 시 보여줄 요약 정보 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkerHoverDto {

    /**
     * 작업자 ID
     */
    private Long workerId;

    /**
     * 작업자 이름 (형식: 이름 + 전화번호 뒷 4자리, 예: 홍길동 1234)
     */
    private String name;

    /**
     * 작업자가 소속된 구역 ID
     * Enum 매핑을 위해 서비스 계층에서 사용하며, 클라이언트로는 전송하지 않음
     */
    @JsonIgnore
    private Long zoneId;

    /**
     * 작업자 전화번호
     * 이름 포맷팅을 위해 서비스 계층에서 사용하며, 클라이언트로는 전송하지 않음
     */
    @JsonIgnore
    private String phoneNumber;

    /**
     * 현재 구역 이름 (예: 수하물 처리 구역)
     * zoneId를 기반으로 서비스 계층에서 변환하여 설정
     */
    private String currentZoneName;

    /**
     * 현재 실시간 위치 코드 (예: A-12-04)
     * batch_tasks 및 zone_locations 테이블 조인을 통해 조회
     */
    private String currentLocationCode;

    /**
     * 금일 작업 처리량
     * 오늘 날짜 기준으로 처리 완료된(PENDING이 아닌) 작업 수
     */
    private Integer todayWorkCount;

    /**
     * 최근 발생한 이슈 타입
     * 상태가 OPEN인 가장 최근 이슈의 타입 (없으면 null)
     */
    private String recentIssueType;

    private Long recentIssueId;
}
