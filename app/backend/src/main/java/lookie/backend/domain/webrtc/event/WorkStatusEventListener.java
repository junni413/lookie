package lookie.backend.domain.webrtc.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.worklog.event.WorkStatusChangedEvent;
import lookie.backend.domain.worklog.vo.WorkLogEventType;
import lookie.backend.global.constant.RedisKeyConstants;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * WorkLog 상태 변경 이벤트를 수신하여 WebRTC 가용성 상태를 Redis에 동기화
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkStatusEventListener {

    private final StringRedisTemplate redisTemplate;

    /**
     * 근무 상태 변경 시 Redis 상태 동기화
     * - START/RESUME: Redis 키 삭제 (가용 상태)
     * - PAUSE: Redis에 "PAUSED" 설정 (불가용)
     * - END: Redis에 "AWAY" 설정 (불가용)
     */
    @EventListener
    @Async // 비동기 처리 (WorkLog 응답 속도에 영향 안 줌)
    public void handleWorkStatusChanged(WorkStatusChangedEvent event) {
        String key = RedisKeyConstants.USER_STATUS_KEY + event.getUserId();

        try {
            switch (event.getEventType()) {
                case START:
                case RESUME:
                    // 가용 상태 = Redis 키 삭제
                    redisTemplate.delete(key);
                    log.info("✅ [WorkStatus→Redis] User {} 가용 상태로 전환 ({})",
                            event.getUserId(), event.getEventType());
                    break;

                case PAUSE:
                    // 휴식 상태 = PAUSED 설정 (TTL 1시간)
                    redisTemplate.opsForValue().set(key, "PAUSED", 1, TimeUnit.HOURS);
                    log.info("⏸️ [WorkStatus→Redis] User {} 휴식 상태로 전환 (사유: {})",
                            event.getUserId(), event.getReason());
                    break;

                case END:
                    // 퇴근 상태 = AWAY 설정 (TTL 12시간)
                    redisTemplate.opsForValue().set(key, "AWAY", 12, TimeUnit.HOURS);
                    log.info("🏠 [WorkStatus→Redis] User {} 퇴근 상태로 전환",
                            event.getUserId());
                    break;

                default:
                    log.warn("⚠️ [WorkStatus→Redis] 알 수 없는 이벤트 타입: {}", event.getEventType());
            }
        } catch (Exception e) {
            log.error("❌ [WorkStatus→Redis] Redis 상태 업데이트 실패. UserId: {}, EventType: {}",
                    event.getUserId(), event.getEventType(), e);
            // Redis 실패해도 WorkLog 로직은 정상 진행 (비동기이므로 영향 없음)
        }
    }
}
