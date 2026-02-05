package lookie.backend.domain.control.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.control.repository.ControlRedisRepository;
import lookie.backend.domain.worklog.event.WorkStatusChangedEvent;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

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
     * - 트랜잭션 커밋 후 실행하여 데이터 일관성 보장
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
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
     * - 트랜잭션 커밋 후 실행하여 데이터 일관성 보장
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handleWorkStatusChanged(WorkStatusChangedEvent event) {
        log.info("[Cache Invalidation] 근무 상태 변경 감지: userId={}, type={}, zoneId={}",
                event.getUserId(), event.getEventType(), event.getZoneId());

        try {
            // 1. 작업자 캐시 삭제
            redisRepository.deleteWorkerCache(event.getUserId());

            // 2. 구역 캐시 삭제 (실시간 정합성 확보)
            if (event.getZoneId() != null) {
                // 특정 구역 캐시만 삭제 (효율적)
                redisRepository.deleteZoneCache(event.getZoneId());
                log.info("[Cache Invalidation] Zone 캐시 삭제: zoneId={}", event.getZoneId());
            } else {
                // zoneId가 없는 경우 모든 구역 캐시 삭제 (안전장치)
                // 관리자(ADMIN)의 경우 구역 배정이 없을 수 있음
                log.warn("[Cache Invalidation] zoneId 없음 - 모든 Zone 캐시 삭제 (안전장치)");
                for (long zoneId = 1; zoneId <= 4; zoneId++) {
                    redisRepository.deleteZoneCache(zoneId);
                }
            }

            // 3. 대시보드 캐시 삭제
            redisRepository.deleteDashboardCache();

        } catch (Exception e) {
            log.error("[Cache Invalidation] 근무 상태 캐시 삭제 실패", e);
        }
    }
}
