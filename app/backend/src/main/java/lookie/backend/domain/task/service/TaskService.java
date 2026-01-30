package lookie.backend.domain.task.service;

import lombok.RequiredArgsConstructor;
import lookie.backend.domain.location.exception.LocationNotFoundException;
import lookie.backend.domain.location.exception.LocationZoneMismatchException;
import lookie.backend.domain.location.mapper.LocationMapper;
import lookie.backend.domain.location.vo.LocationVO;
import lookie.backend.domain.task.event.TaskCompletedEvent;
import lookie.backend.domain.task.exception.InvalidTaskActionStateException;
import lookie.backend.domain.task.exception.InvalidTaskStateException;
import lookie.backend.domain.task.exception.NoAvailableTaskException;
import lookie.backend.domain.task.exception.TaskAlreadyAssignedException;
import lookie.backend.domain.task.exception.TaskNotFoundException;
import lookie.backend.domain.task.exception.InvalidToteBarcodeException;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.vo.TaskActionStatus;
import lookie.backend.domain.task.vo.TaskStatus;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.domain.tote.exception.ToteAlreadyInUseException;
import lookie.backend.domain.tote.mapper.ToteMapper;
import lookie.backend.domain.tote.vo.ToteVO;
import lookie.backend.domain.zone.exception.WorkerZoneNotAssignedException;
import lookie.backend.domain.zone.mapper.ZoneAssignmentMapper;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TaskService {
    private final TaskMapper taskMapper;
    private final ToteMapper toteMapper;
    private final LocationMapper locationMapper;
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
                        updatedTask.getZoneId()));

    }

    /**
     * [토트 스캔]
     * - 검증: 현재 상태가 SCAN_TOTE인지, 바코드 일치 여부
     * - 실행: DB 업데이트 (SCAN_LOCATION으로 전이)
     */
    @Transactional
    public TaskVO scanTote(Long taskId, String toteBarcode) {
        // 1. 작업 조회
        TaskVO task = taskMapper.findById(taskId);
        if (task == null) {
            throw new TaskNotFoundException(taskId);
        }

        // 2. FSM 검증
        if (task.getActionStatus() != TaskActionStatus.SCAN_TOTE) {
            throw new InvalidTaskActionStateException(task.getActionStatus(), TaskActionStatus.SCAN_TOTE);
        }

        // 3. 바코드 검증 및 할당 로직
        ToteVO scannedTote = toteMapper.findByBarcode(toteBarcode);
        if (scannedTote == null) {
            // 등록되지 않은 토트 바코드
            throw new InvalidToteBarcodeException();
        }

        // 이미 할당된 토트가 있는지?
        if (task.getToteId() != null) {
            // [검증 모드] 이미 작업에 토트가 할당된 경우 -> 스캔된 토트와 일치하는지 확인
            if (!task.getToteId().equals(scannedTote.getToteId())) {
                throw new InvalidToteBarcodeException(); // 또는 ID_MISMATCH
            }
        } else {
            // [할당 모드] 작업에 토트가 없는 경우 -> 스캔된 토트를 이 작업에 할당
            if (scannedTote.getCurrentBatchTaskId() != null) {
                // 이미 다른 작업(또는 같은 작업)에 물려있는 토트
                if (!scannedTote.getCurrentBatchTaskId().equals(taskId)) {
                    throw new ToteAlreadyInUseException();
                }
            }
        }

        // 4. 상태 업데이트 (양방향)
        // Task 업데이트 (action_status, tote_scanned_at, tote_id)
        int updated = taskMapper.updateToteScanResult(taskId, scannedTote.getToteId());
        if (updated == 0) {
            // 이미 상태가 변했거나 동시성 이슈
            throw new InvalidTaskActionStateException(task.getActionStatus(), TaskActionStatus.SCAN_TOTE);
        }

        // Tote 업데이트 (current_batch_task_id)
        toteMapper.updateToteMapping(scannedTote.getToteId(), taskId);

        return taskMapper.findById(taskId);
    }

    /**
     * [지번 스캔]
     * - 검증: 현재 상태가 SCAN_LOCATION인지, 스캔된 지번이 작업 구역에 속하는지
     * - 실행: DB 업데이트 (SCAN_ITEM으로 전이)
     */
    @Transactional
    public TaskVO scanLocation(Long taskId, String locationCode) {
        // 1. 작업 조회
        TaskVO task = taskMapper.findById(taskId);
        if (task == null) {
            throw new TaskNotFoundException(taskId);
        }

        // 2. FSM 검증
        if (task.getActionStatus() != TaskActionStatus.SCAN_LOCATION) {
            throw new InvalidTaskActionStateException(task.getActionStatus(), TaskActionStatus.SCAN_LOCATION);
        }

        // 3. 지번 조회 및 검증
        LocationVO scannedLocation = locationMapper.findByCode(locationCode);
        if (scannedLocation == null) {
            throw new LocationNotFoundException();
        }

        // 구역 검증 (현재 작업의 구역과 일치하는지)
        if (!task.getZoneId().equals(scannedLocation.getZoneId())) {
            throw new LocationZoneMismatchException();
        }

        // 4. 상태 업데이트
        int updated = taskMapper.updateLocationScanResult(taskId);
        if (updated == 0) {
            throw new InvalidTaskActionStateException(task.getActionStatus(), TaskActionStatus.SCAN_LOCATION);
        }

        return taskMapper.findById(taskId);
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
