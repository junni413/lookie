package lookie.backend.domain.control.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.control.repository.ControlRedisRepository;
import lookie.backend.domain.worklog.event.WorkStatusChangedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Control 도메인 관제 데이터 캐시 무효화 리스너
 * - 이벤트를 수신하여 데이터 변경 시 관련 Redis 캐시를 삭제
 * - 서비스 간 결합도를 낮추고 데이터 일관성을 유지
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ControlCacheInvalidationListener {

    private final ControlRedisRepository redisRepository;

    /**
     * 구역 배정 변경 시 캐시 무효화
     * - 작업자 캐시 삭제
     * - 이전 구역 캐시 삭제
     * - 새 구역 캐시 삭제
     * - 대시보드 캐시 삭제
     */
    @EventListener
    @Async
    public void handleZoneAssignmentChanged(ZoneAssignmentEvent event) {
        log.info("[Cache Invalidation] 구역 배정 변경 감지: workerId={}, prev={}, new={}",
                event.getWorkerId(), event.getPreviousZoneId(), event.getNewZoneId());

        try {
            // 1. 작업자 캐시 삭제 (상태, 위치)
            redisRepository.deleteWorkerCache(event.getWorkerId());

            // 2. 이전 구역 캐시 삭제 (Worker List 갱신 필요)
            if (event.getPreviousZoneId() != null) {
                redisRepository.deleteZoneCache(event.getPreviousZoneId());
            }

            // 3. 새 구역 캐시 삭제 (Worker List 갱신 필요)
            if (event.getNewZoneId() != null) {
                redisRepository.deleteZoneCache(event.getNewZoneId());
            }

            // 4. 대시보드 캐시 삭제 (구역별 통계 변경)
            redisRepository.deleteDashboardCache();

        } catch (Exception e) {
            log.error("[Cache Invalidation] 구역 배정 캐시 삭제 실패", e);
        }
    }

    /**
     * 근무 상태 변경 시 캐시 무효화 (출근, 퇴근, 휴식, 재개)
     * - 작업자 캐시 삭제 (Status 변경)
     * - Zone 캐시 삭제 (Worker Count 변경 가능성 - 출/퇴근 시)
     * - 대시보드 캐시 삭제 (Active Worker Count 변경)
     */
    @EventListener
    @Async
    public void handleWorkStatusChanged(WorkStatusChangedEvent event) {
        log.info("[Cache Invalidation] 근무 상태 변경 감지: userId={}, type={}",
                event.getUserId(), event.getEventType());

        try {
            // 1. 작업자 캐시 삭제
            redisRepository.deleteWorkerCache(event.getUserId());

            // 2. 대시보드 캐시 삭제
            redisRepository.deleteDashboardCache();

            // Note: Zone ID를 이벤트를 통해 알 수 있다면 Zone 캐시도 삭제하는 것이 좋음.
            // 하지만 WorkStatusChangedEvent에 Zone ID가 없다면,
            // WorkerCache가 다시 생성될 때 정합성이 맞춰지거나,
            // ZoneOverview의 TTL(60초)에 의해 결국 갱신됨.
            // 즉각적인 갱신을 위해서는 Event에 ZoneId가 포함되어야 함.

            // 현재 구조상 Zone 캐시는 TTL 만료 혹은 ZoneAssignmentEvent에 의존

        } catch (Exception e) {
            log.error("[Cache Invalidation] 근무 상태 캐시 삭제 실패", e);
        }
    }
}
