package lookie.backend.domain.control.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.task.event.TaskItemCompletedEvent;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.vo.TaskVO;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Duration;

@Slf4j
@Component
@RequiredArgsConstructor
public class ControlEventListener {

    private final TaskMapper taskMapper;
    private final StringRedisTemplate redisTemplate;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleTaskItemCompleted(TaskItemCompletedEvent event) {
        try {
            Long taskId = event.getBatchTaskId();

            // Task 정보를 조회하여 배치/구역 정보 획득
            TaskVO task = taskMapper.findById(taskId);

            if (task == null) {
                log.warn("[ControlEvent] Task not found for ID: {}", taskId);
                return;
            }

            Long batchId = task.getBatchId();
            Long zoneId = task.getZoneId();

            // 멱등성 체크 (24시간)
            String eventKey = "lookie:control:item:processed:" + event.getBatchTaskItemId();
            Boolean isNew = redisTemplate.opsForValue().setIfAbsent(eventKey, "1", Duration.ofHours(24));

            if (Boolean.FALSE.equals(isNew)) {
                log.info("[ControlEvent] Already processed item: {}", event.getBatchTaskItemId());
                return;
            }

            // Redis Key
            String progressKey = "lookie:control:zone:" + zoneId + ":progress";

            // 1. Completed 증가
            Long completed = redisTemplate.opsForHash().increment(progressKey, "completed", 1);

            // 2. ProgressRate 재계산
            String totalStr = (String) redisTemplate.opsForHash().get(progressKey, "total");
            int total = (totalStr != null) ? Integer.parseInt(totalStr) : 0;

            double rate = (total > 0) ? (double) completed * 100 / total : 0.0;
            rate = Math.round(rate * 10.0) / 10.0; // 소수점 1자리

            redisTemplate.opsForHash().put(progressKey, "progressRate", String.valueOf(rate));

            log.info("[ControlEvent] Zone {} Progress Updated: {}/{} ({}%)", zoneId, completed, total, rate);

        } catch (Exception e) {
            log.error("[ControlEvent] Error handling TaskItemCompletedEvent", e);
        }
    }
}
