package lookie.backend.domain.worklog.event;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lookie.backend.domain.worklog.vo.WorkLogEventType;

/**
 * 근무 상태 변경 이벤트
 * - WorkLog 도메인에서 발행
 * - WebRTC 도메인에서 수신하여 Redis 상태 동기화
 * - Control 도메인에서 수신하여 Zone 캐시 무효화
 */
@Getter
@AllArgsConstructor
public class WorkStatusChangedEvent {
    private Long userId;
    private WorkLogEventType eventType; // START, PAUSE, RESUME, END
    private String reason; // 상태 변경 사유 (선택)
    private Long zoneId; // 작업자가 속한 구역 ID (실시간 캐시 무효화용)
}
