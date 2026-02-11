package lookie.backend.domain.task.infra;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.task.exception.TaskLockFailedException;
import lookie.backend.domain.task.dto.TaskResponse;
import lookie.backend.domain.task.service.TaskWorkflowService;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.domain.zone.exception.WorkerZoneNotAssignedException;
import lookie.backend.domain.zone.mapper.ZoneAssignmentMapper;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * TaskLockExecutor
 * - Redis 분산 락을 이용한 동시성 제어 전용 컴포넌트
 * - 비즈니스 로직 / FSM / 트랜잭션을 직접 다루지 않음
 * 
 * TTL 설정 기준:
 * - waitTime: 200ms (작업 할당 시간의 2-3배, 짧은 대기로 재시도 효과)
 * - leaseTime: 2초 (작업 할당 시간의 10-15배, 안전 마진)
 * - 작업 할당 예상 시간: 70-200ms (정상), 최대 300ms (DB 부하 시)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TaskLockExecutor {

    private final RedissonClient redissonClient;
    private final ZoneAssignmentMapper zoneAssignmentMapper;
    private final TaskWorkflowService taskWorkflowService;
    private final TaskMapper taskMapper;

    // TTL 설정 상수
    private static final long LOCK_WAIT_TIME_MS = 200; // 락 대기 시간 (200ms)
    private static final long LOCK_LEASE_TIME_SECONDS = 2; // 락 유지 시간 (2초)
    private static final int MAX_RETRY_COUNT = 3; // 최대 재시도 횟수

    /**
     * 작업 시작
     * - zone 기준 Redis 락
     * - 락 안에서 TaskService 호출
     * - 재시도 로직 포함 (병목 완화)
     */
    public TaskResponse<TaskVO> startTask(Long workerId) {
        // 1. 작업자의 현재 zone 조회
        Long zoneId = zoneAssignmentMapper.findZoneIdByWorkerId(workerId);
        if (zoneId == null) {
            throw new WorkerZoneNotAssignedException(workerId);
        }

        // 2. zone 기준 락 키 생성
        String lockKey = "lock:task:assign:zone:" + zoneId;

        // 3. 재시도 로직 포함 락 획득
        TaskLockFailedException lastException = null;
        for (int attempt = 1; attempt <= MAX_RETRY_COUNT; attempt++) {
            RLock lock = redissonClient.getLock(lockKey);

            boolean locked;
            try {
                // waitTime: 200ms (짧은 대기로 순차 처리 허용)
                // leaseTime: 2초 (작업 할당 시간의 10배, 안전 마진)
                locked = lock.tryLock(LOCK_WAIT_TIME_MS, LOCK_LEASE_TIME_SECONDS, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                lastException = new TaskLockFailedException(lockKey);
                break; // 재시도 중단
            } catch (RuntimeException e) {
                lastException = new TaskLockFailedException(lockKey);
                if (attempt < MAX_RETRY_COUNT) {
                    log.warn("[TaskLock] Lock acquisition failed (attempt {}/{}), retrying...",
                            attempt, MAX_RETRY_COUNT);
                    continue;
                }
                break;
            }

            // 락 획득 성공
            if (locked) {
                try {
                    long startTime = System.currentTimeMillis();
                    // 4. 실제 비즈니스 로직은 TaskWorkflowService에 위임 (zoneId 전달)
                    TaskResponse<TaskVO> result = taskWorkflowService.assignTask(workerId, zoneId);
                    long duration = System.currentTimeMillis() - startTime;

                    // 성능 모니터링 로그 (2초 이상이면 경고)
                    if (duration > 1000) {
                        log.warn("[TaskLock] Task assignment took {}ms (zoneId={}, workerId={})",
                                duration, zoneId, workerId);
                    } else {
                        log.debug("[TaskLock] Task assignment completed in {}ms (zoneId={}, workerId={})",
                                duration, zoneId, workerId);
                    }

                    return result;
                } finally {
                    // 5. 락 해제
                    if (lock.isHeldByCurrentThread()) {
                        lock.unlock();
                    }
                }
            } else {
                // 락 획득 실패 (다른 작업자가 사용 중)
                if (attempt < MAX_RETRY_COUNT) {
                    log.debug("[TaskLock] Lock busy, retrying... (attempt {}/{}, zoneId={})",
                            attempt, MAX_RETRY_COUNT, zoneId);
                    // 짧은 지연 후 재시도 (exponential backoff)
                    try {
                        Thread.sleep(50 * attempt); // 50ms, 100ms, 150ms
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                } else {
                    lastException = new TaskLockFailedException(lockKey);
                }
            }
        }

        // 모든 재시도 실패
        log.error("[TaskLock] Failed to acquire lock after {} attempts (zoneId={}, workerId={})",
                MAX_RETRY_COUNT, zoneId, workerId);
        if (lastException != null) {
            throw lastException;
        }
        throw new TaskLockFailedException(lockKey);
    }

    /**
     * 작업 완료
     * - task 단위 Redis 락
     * - 중복 완료 요청 방지
     * - 작업 완료는 빠르므로 waitTime=0, leaseTime=1초로 설정
     */
    public void completeTask(Long taskId) {
        String lockKey = "lock:task:complete:" + taskId;
        RLock lock = redissonClient.getLock(lockKey);

        boolean locked;
        try {
            // waitTime = 0: 작업 완료는 빠르므로 즉시 실패 (중복 방지 우선)
            // leaseTime = 1초: 작업 완료 시간의 5배 (안전 마진)
            locked = lock.tryLock(0, 1, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new TaskLockFailedException(lockKey);
        } catch (RuntimeException e) {
            throw new TaskLockFailedException(lockKey);
        }

        // 락 획득 실패
        if (!locked) {
            log.warn("[TaskLock] Task completion lock failed (taskId={}) - duplicate request?", taskId);
            throw new TaskLockFailedException(lockKey);
        }

        try {
            // 실제 비즈니스 로직은 TaskWorkflowService에 위임
            // Task 내부에서 workerId를 조회하여 검증
            TaskVO task = taskMapper.findById(taskId);
            if (task != null && task.getWorkerId() != null) {
                taskWorkflowService.completeTask(task.getWorkerId(), taskId);
            } else {
                log.error("[TaskLock] Task not found or no worker assigned - taskId={}", taskId);
                throw new TaskLockFailedException("lock:task:complete:" + taskId);
            }
        } finally {
            // 락 해제
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}
