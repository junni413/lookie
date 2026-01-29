package lookie.backend.domain.task.service;

import lombok.RequiredArgsConstructor;
import lookie.backend.domain.task.event.TaskCompletedEvent;
import lookie.backend.domain.task.exception.InvalidTaskStateException;
import lookie.backend.domain.task.exception.NoAvailableTaskException;
import lookie.backend.domain.task.exception.TaskAlreadyAssignedException;
import lookie.backend.domain.task.exception.TaskNotFoundException;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.vo.TaskStatus;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.domain.zone.exception.WorkerZoneNotAssignedException;
import lookie.backend.domain.zone.mapper.ZoneAssignmentMapper;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TaskService {
    private final TaskMapper taskMapper;
    private final ZoneAssignmentMapper zoneAssignmentMapper;
    private final ApplicationEventPublisher publisher;

    /**
     * [작업 시작] 구역 기준 자동 작업 배정
     * - UNASSIGNED 작업 중 1개를 선택
     * - IN_PROGRESS로 상태 전이
     * - worker 할당
     */
    @Transactional
    public TaskVO startTask(Long workerId) {

        // 1. 작업자의 zone 조회
        Long zoneId = zoneAssignmentMapper.findZoneIdByWorkerId(workerId);
        if (zoneId == null) {
            throw new WorkerZoneNotAssignedException(workerId);
        }
        // 2. 해당 구역의 미할당 작업 조회
        TaskVO task = taskMapper.findNextUnassignedForZoneForUpdate(zoneId);
        if (task == null) {
            throw new NoAvailableTaskException(zoneId);
        }

        // 3. FSM 검증
        validateTransition(task.getStatus(), TaskStatus.IN_PROGRESS);

        // 4. 상태 전이
        int updated = taskMapper.updateAssignToInProgress(task.getBatchTaskId(), workerId);
        if (updated == 0) {
            throw new TaskAlreadyAssignedException(task.getBatchTaskId());
        }

        return taskMapper.findById(task.getBatchTaskId());

    }

    // 작업 완료
    @Transactional
    public void completeTask(Long taskId) {

        // 1. 존재 확인
        TaskVO task = taskMapper.findById(taskId);
        if (task == null) {
            throw new TaskNotFoundException(taskId);
        }

        // 2. FSM 검증
        validateTransition(task.getStatus(), TaskStatus.COMPLETED);

        // 3. 완료
        int updated = taskMapper.updateComplete(taskId);
        if (updated == 0) {
            // 업데이트 실패면 상태 불일치 가능성 (동시성/중복요청)
            throw new InvalidTaskStateException(TaskStatus.valueOf(task.getStatus()), TaskStatus.COMPLETED);
        }

        TaskVO updatedTask = taskMapper.findById(taskId);

        // 이벤트 발행
        publisher.publishEvent(
                new TaskCompletedEvent(
                        updatedTask.getBatchTaskId(),
                        updatedTask.getWorkerId(),
                        updatedTask.getZoneId()
                )
        );

    }

    // Task FSM 검증 로직 (상태 전이 규칙 통제)
    private void validateTransition(String currentStatus, TaskStatus targetStatus) {
        TaskStatus from = TaskStatus.valueOf(currentStatus);

        // UNASSIGNED -> IN_PROGRESS
        if (from == TaskStatus.UNASSIGNED && targetStatus == TaskStatus.IN_PROGRESS) {
            return;
        }

        // IN_PROGRESS -> COMPLETED
        if (from == TaskStatus.IN_PROGRESS && targetStatus == TaskStatus.COMPLETED) {
            return;
        }

        throw new InvalidTaskStateException(from, targetStatus);
    }
}
