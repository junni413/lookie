package lookie.backend.domain.control.event;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.ToString;

/**
 * 작업자 구역 배정 변경 이벤트
 * - 자동 배정, 관리자 강제 배정, 퇴근 시 배정 해제 등 구역 변경 발생 시 발행
 * - Redis 캐시 무효화 리스너에서 수신하여 처리
 */
@Getter
@AllArgsConstructor
@ToString
public class ZoneAssignmentEvent {

    private Long workerId;

    /**
     * 새로운 배정 구역 ID (해제 시 null)
     */
    private Long newZoneId;

    /**
     * 기존 배정 구역 ID (없는 경우 null)
     * - 캐시 무효화 시 이전 구역의 Worker List에서도 제거하기 위함
     */
    private Long previousZoneId;

    /**
     * 이벤트 발생 시간 (Epoch Millis)
     */
    private long timestamp;

    public static ZoneAssignmentEvent create(Long workerId, Long newZoneId, Long previousZoneId) {
        return new ZoneAssignmentEvent(workerId, newZoneId, previousZoneId, System.currentTimeMillis());
    }
}
