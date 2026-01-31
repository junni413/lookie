package lookie.backend.domain.task.service;

import lombok.RequiredArgsConstructor;
import lookie.backend.domain.location.service.LocationService;
import lookie.backend.domain.location.vo.LocationVO;
import lookie.backend.domain.task.constant.NextAction;
import lookie.backend.domain.task.dto.TaskResponse;
import lookie.backend.domain.task.exception.InvalidTaskActionStateException;
import lookie.backend.domain.task.exception.NoAvailableTaskException;
import lookie.backend.domain.task.exception.TaskNotFoundException;
import lookie.backend.domain.task.event.TaskCompletedEvent;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.vo.TaskActionStatus;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.domain.tote.service.ToteService;
import lookie.backend.domain.tote.vo.ToteVO;
import lookie.backend.domain.zone.mapper.ZoneAssignmentMapper;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Task 메인 워크플로우를 주관하는 Facade 서비스
 * - 집품 프로세스(할당~완료) 전체 흐름 제어
 * - 트랜잭션 경계 설정 및 도메인 서비스 간 오케스트레이션
 * - 다음 단계 행동(NextAction) 결정
 */
@Service
@RequiredArgsConstructor
public class TaskWorkflowFacade {

    private final TaskMapper taskMapper;
    private final TaskItemService taskItemService;
    private final ToteService toteService;
    private final LocationService locationService;
    private final ZoneAssignmentMapper zoneAssignmentMapper;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * [워크플로우 1단계] 작업 할당 및 시작
     * - 구역 내 대기 중인 작업을 작업자에게 배정하고 진행 상태로 전환합니다.
     */
    @Transactional
    public TaskResponse<TaskVO> startTask(Long workerId) {
        Long zoneId = zoneAssignmentMapper.findZoneIdByWorkerId(workerId);
        if (zoneId == null) {
            throw new NoAvailableTaskException(0L); // 구역 미배정 예외 (간소화)
        }

        TaskVO task = taskMapper.findNextUnassignedForZoneForUpdate(zoneId);
        if (task == null) {
            throw new NoAvailableTaskException(zoneId);
        }

        taskMapper.updateAssignToInProgress(task.getBatchTaskId(), workerId);
        TaskVO updatedTask = taskMapper.findById(task.getBatchTaskId());

        return TaskResponse.of(updatedTask, NextAction.SCAN_TOTE);
    }

    /**
     * [워크플로우 2단계] 토트 바코드 스캔
     * - 작업에 사용할 토트를 스캔하고 작업과 매핑합니다.
     */
    @Transactional
    public TaskResponse<TaskVO> scanTote(Long taskId, String barcode) {
        TaskVO task = getTaskOrThrow(taskId);
        validateAction(task, TaskActionStatus.SCAN_TOTE);

        ToteVO tote = toteService.getByBarcode(barcode);
        toteService.validateToteAvailability(tote, taskId);

        taskMapper.updateToteScanResult(taskId, tote.getToteId());
        toteService.mappingToTask(tote.getToteId(), taskId);

        return TaskResponse.of(taskMapper.findById(taskId), NextAction.SCAN_LOCATION);
    }

    /**
     * [워크플로우 3단계] 지번 바코드 스캔
     * - 집품할 상품이 있는 위치(Location)를 확인합니다.
     */
    @Transactional
    public TaskResponse<TaskVO> scanLocation(Long taskId, String locationCode) {
        TaskVO task = getTaskOrThrow(taskId);
        validateAction(task, TaskActionStatus.SCAN_LOCATION);

        LocationVO location = locationService.getByCode(locationCode);
        locationService.validateZone(location, task.getZoneId());

        taskMapper.updateLocationScanResult(taskId, location.getLocationId());

        return TaskResponse.of(taskMapper.findById(taskId), NextAction.SCAN_ITEM);
    }

    /**
     * [워크플로우 4단계] 상품 바코드 스캔
     * - 상품을 식별하고 즉시 수량을 1 증가시킵니다. (기본 1개 집품 처리)
     */
    @Transactional
    public TaskResponse<TaskItemVO> scanItem(Long taskId, String barcode) {
        TaskVO task = getTaskOrThrow(taskId);
        validateAction(task, TaskActionStatus.SCAN_ITEM);

        TaskItemVO item = taskItemService.scanAndGetItem(taskId, task.getCurrentLocationId(), barcode);

        // 스캔 시 기본 1개 증가 처리
        TaskItemVO updatedItem = taskItemService.updateQuantityAtomic(item.getBatchTaskItemId(), 1);

        // 수량이 다 찼으면 다음 단계(SCAN_LOCATION 등), 아니면 수량 조절(ADJUST_QUANTITY)
        NextAction nextAction = determineNextActionAfterPick(updatedItem);
        return TaskResponse.of(updatedItem, nextAction);
    }

    /**
     * [워크플로우 5단계] 상품 집품(수량 조정)
     * - 상품을 집품하여 수량을 반영하고, 해당 상품 또는 지번의 완료 여부를 판단합니다.
     */
    @Transactional
    public TaskResponse<TaskItemVO> pickItem(Long itemId, int increment) {
        TaskItemVO updatedItem = taskItemService.updateQuantityAtomic(itemId, increment);

        NextAction nextAction = determineNextActionAfterPick(updatedItem);
        return TaskResponse.of(updatedItem, nextAction);
    }

    /**
     * [워크플로우 6단계] 전체 작업 완료
     * - 해당 작업 내 모든 상품의 집품이 완료되었을 때 작업을 최종 종료 처리합니다.
     */
    @Transactional
    public void completeTask(Long taskId) {
        TaskVO task = getTaskOrThrow(taskId);
        // 완료 가능 여부 체크 로직 추가 가능
        taskMapper.updateComplete(taskId);

        // 이벤트 발행 복구
        eventPublisher.publishEvent(new TaskCompletedEvent(
                task.getBatchTaskId(),
                task.getWorkerId(),
                task.getZoneId()));
    }

    private TaskVO getTaskOrThrow(Long taskId) {
        TaskVO task = taskMapper.findById(taskId);
        if (task == null) {
            throw new TaskNotFoundException(taskId);
        }
        return task;
    }

    private void validateAction(TaskVO task, TaskActionStatus expected) {
        if (task.getActionStatus() != expected) {
            throw new InvalidTaskActionStateException(task.getActionStatus(), expected);
        }
    }

    private NextAction determineNextActionAfterPick(TaskItemVO item) {
        if ("DONE".equals(item.getStatus())) {
            // 해당 지번에 남은 PENDING 아이템이 있는지 확인
            List<TaskItemVO> pendingItems = taskItemService.getPendingItemsAtLocation(item.getBatchTaskId(),
                    item.getLocationId());
            if (pendingItems.isEmpty()) {
                // 지번 내 아이템 소진 -> 전체 작업의 잔여 아이템 확인
                int totalPending = taskItemService.countPendingItems(item.getBatchTaskId());
                if (totalPending == 0) {
                    return NextAction.COMPLETE_TASK;
                }
                return NextAction.SCAN_LOCATION;
            } else {
                return NextAction.SCAN_ITEM;
            }
        }
        return NextAction.ADJUST_QUANTITY;
    }
}
