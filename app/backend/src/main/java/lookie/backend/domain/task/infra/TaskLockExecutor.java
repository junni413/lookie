package lookie.backend.domain.task.infra;

import lombok.RequiredArgsConstructor;
import lookie.backend.domain.task.exception.TaskLockFailedException;
import lookie.backend.domain.task.dto.TaskResponse;
import lookie.backend.domain.task.service.TaskWorkflowFacade;
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
 */
@Component
@RequiredArgsConstructor
public class TaskLockExecutor {

    private final RedissonClient redissonClient;
    private final ZoneAssignmentMapper zoneAssignmentMapper;
    private final TaskWorkflowFacade taskWorkflowFacade;

    /**
     * 작업 시작
     * - zone 기준 Redis 락
     * - 락 안에서 TaskService 호출
     */
    public TaskVO startTask(Long workerId) {

        // 1. 작업자의 현재 zone 조회
        Long zoneId = zoneAssignmentMapper.findZoneIdByWorkerId(workerId);
        if (zoneId == null) {
            throw new WorkerZoneNotAssignedException(workerId);
        }

        // 2. zone 기준 락 키 생성
        String lockKey = "lock:task:assign:zone:" + zoneId;

        // 락 객체 획득
        RLock lock = redissonClient.getLock(lockKey);

        boolean locked;
        try {
            // waitTime = 0 : 대기 없이 즉시 실패
            // leaseTime = 5 : 락 획득 후 5초간 유지 (누수 방지)
            locked = lock.tryLock(0, 5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new TaskLockFailedException(lockKey);
        } catch (RuntimeException e) {
            throw new TaskLockFailedException(lockKey);
        }

        // 락 획득 실패
        if (!locked) {
            throw new TaskLockFailedException(lockKey);
        }

        try {
            // 3. 실제 비즈니스 로직은 Facade에 위임
            TaskResponse<TaskVO> response = taskWorkflowFacade.startTask(workerId);
            return response.getPayload();
        } finally {
            // 4. 락 해제
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    /**
     * 작업 완료
     * - task 단위 Redis 락
     * - 중복 완료 요청 방지
     */
    public void completeTask(Long taskId) {

        // 해당 작업 하나만
        String lockKey = "lock:task:complete:" + taskId;
        RLock lock = redissonClient.getLock(lockKey);

        boolean locked;
        try {
            locked = lock.tryLock(0, 5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new TaskLockFailedException(lockKey);
        } catch (RuntimeException e) {
            throw new TaskLockFailedException(lockKey);
        }

        // 락 획득 실패
        if (!locked) {
            throw new TaskLockFailedException(lockKey);
        }

        try {
            // 3. 실제 비즈니스 로직은 Facade에 위임
            taskWorkflowFacade.completeTask(taskId);
        } finally {
            // 4. 락 해제
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}
