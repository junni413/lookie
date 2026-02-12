package lookie.backend.domain.task.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.task.constant.NextAction;
import lookie.backend.domain.task.dto.TaskResponse;
import lookie.backend.domain.tote.service.ToteService;
import lookie.backend.domain.tote.vo.ToteVO;
import lookie.backend.domain.location.service.LocationService;
import lookie.backend.domain.location.vo.LocationVO;
import lookie.backend.domain.task.event.TaskCompletedEvent;
import lookie.backend.domain.task.event.TaskItemCompletedEvent;
import lookie.backend.domain.task.vo.TaskActionStatus;
import lookie.backend.domain.task.exception.*;
import lookie.backend.domain.task.mapper.TaskItemMapper;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.domain.inventory.service.InventoryService;
import lookie.backend.domain.batch.mapper.BatchMapper;
import java.time.LocalDateTime;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * TaskWorkflowService - 새 FSM 기준 Task Workflow 구현
 * Pseudo Code 2장 기준
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TaskWorkflowService {

    private final TaskMapper taskMapper;
    private final TaskItemMapper taskItemMapper;
    private final TaskItemService taskItemService;
    private final ToteService toteService;
    private final LocationService locationService;
    private final InventoryService inventoryService;
    private final ApplicationEventPublisher eventPublisher;
    private final BatchMapper batchMapper;

    // ========== 2.1 assignTask / scanTote ==========

    @Transactional
    public TaskResponse<TaskVO> assignTask(Long workerId, Long zoneId) {
        log.info("[TaskWorkflowService] assignTask - workerId={}, zoneId={}", workerId, zoneId);

        // 작업자가 이미 진행 중인 작업이 있는지 확인
        TaskVO activeTask = taskMapper.findInProgressByWorkerId(workerId);
        if (activeTask != null) {
            throw new WorkerAlreadyHasTaskException();
        }

        TaskVO task = taskMapper.findNextUnassignedForZoneForUpdate(zoneId);
        if (task == null) {
            throw new NoPickableItemException();
        }

        taskMapper.updateAssignToInProgress(task.getBatchTaskId(), workerId);
        taskMapper.updateActionStatus(task.getBatchTaskId(), TaskActionStatus.SCAN_TOTE);

        log.info("[TaskWorkflowService] Task assigned - taskId={}", task.getBatchTaskId());

        // 업데이트된 Task 조회 및 TaskResponse 반환
        TaskVO updatedTask = taskMapper.findById(task.getBatchTaskId());
        return TaskResponse.of(updatedTask, NextAction.SCAN_TOTE, null);
    }

    @Transactional
    public TaskResponse<TaskVO> scanTote(Long workerId, Long taskId, String toteBarcode) {
        log.info("[TaskWorkflowService] scanTote - taskId={}, toteBarcode={}", taskId, toteBarcode);

        TaskVO task = taskMapper.findByIdForUpdate(taskId);
        assertTaskOwnership(task, workerId);
        assertTaskStatus(task, "IN_PROGRESS");
        assertActionStatus(task, TaskActionStatus.SCAN_TOTE);

        // ToteService를 통한 검증 및 매핑
        ToteVO tote = toteService.getByBarcode(toteBarcode);
        toteService.validateToteAvailability(tote, taskId);
        toteService.mappingToTask(tote.getToteId(), taskId);

        task.setToteId(tote.getToteId()); // 데이터 유실 방지를 위해 toteId 세팅
        task.setActionStatus(TaskActionStatus.SCAN_LOCATION);
        task.setToteScannedAt(LocalDateTime.now()); // 스캔 시각 기록 보완
        taskMapper.updateTask(task);

        log.info("[TaskWorkflowService] Tote scanned - taskId={}, toteId={}", taskId, tote.getToteId());

        // TaskResponse 반환
        TaskVO updatedTask = taskMapper.findById(taskId);
        TaskItemVO nextItem = taskItemService.getNextItem(taskId);
        return TaskResponse.of(updatedTask, NextAction.SCAN_LOCATION, nextItem);
    }

    // ========== 2.2 scanLocation ==========

    @Transactional
    public TaskResponse<TaskVO> scanLocation(Long workerId, Long taskId, String locationCode) {
        log.info("[TaskWorkflowService] scanLocation - taskId={}, locationCode={}", taskId, locationCode);

        TaskVO task = taskMapper.findByIdForUpdate(taskId);
        assertTaskOwnership(task, workerId);
        assertTaskStatus(task, "IN_PROGRESS");
        assertActionStatus(task, TaskActionStatus.SCAN_LOCATION);

        // LocationService를 통한 검증
        LocationVO location = locationService.getByCode(locationCode);
        locationService.validateZone(location, task.getZoneId());

        TaskItemVO nextItem = taskItemService.getNextItem(taskId);
        if (nextItem == null) {
            log.warn("[TaskWorkflowService] scanLocation failed - No pickable item found for taskId={}", taskId);
            throw new NoPickableItemException();
        }

        if (!location.getLocationId().equals(nextItem.getLocationId())) {
            throw new LocationMismatchException();
        }

        // UI/관제용 위치 기록
        task.setCurrentLocationId(location.getLocationId());
        task.setActionStatus(TaskActionStatus.SCAN_ITEM);
        task.setLocationScannedAt(LocalDateTime.now()); // 스캔 시각 기록 보완
        taskMapper.updateTask(task);

        log.info("[TaskWorkflowService] Location scanned - taskId={}, locationId={}", taskId, location.getLocationId());

        // TaskResponse 반환
        TaskVO updatedTask = taskMapper.findById(taskId);
        return TaskResponse.of(updatedTask, NextAction.SCAN_ITEM, nextItem);
    }

    // ========== 2.4 scanItem ==========

    @Transactional
    public TaskResponse<TaskItemVO> scanItem(Long workerId, Long taskId,
            String productBarcode) {
        log.info("[TaskWorkflowService] scanItem - taskId={}, productBarcode={}", taskId, productBarcode);

        TaskVO task = taskMapper.findByIdForUpdate(taskId);
        assertTaskOwnership(task, workerId);
        assertTaskStatus(task, "IN_PROGRESS");
        assertActionStatus(task, TaskActionStatus.SCAN_ITEM);

        assertSingleInProgress(taskId);

        // TaskItemService를 통한 상품 검증 및 조회
        TaskItemVO item = taskItemService.scanAndGetItem(taskId, task.getCurrentLocationId(), productBarcode);

        taskItemMapper.updateStatus(item.getBatchTaskItemId(), "IN_PROGRESS");
        taskItemMapper.setPickedQty(item.getBatchTaskItemId(), 0);

        task.setActionStatus(TaskActionStatus.ADJUST_QUANTITY);
        taskMapper.updateTask(task);

        log.info("[TaskWorkflowService] Item scanned - taskId={}, itemId={}", taskId, item.getBatchTaskItemId());

        // 업데이트된 아이템 재조회하여 반환
        TaskItemVO updatedItem = taskItemMapper.findById(item.getBatchTaskItemId());
        return TaskResponse.of(updatedItem,
                NextAction.ADJUST_QUANTITY);
    }

    // ========== 2.5 adjustQuantity ==========

    @Transactional
    public TaskResponse<TaskItemVO> adjustQuantity(Long workerId, Long taskId,
            Long taskItemId, Integer increment) {
        log.info("[TaskWorkflowService] adjustQuantity - taskId={}, itemId={}, increment={}", taskId, taskItemId,
                increment);

        TaskVO task = taskMapper.findByIdForUpdate(taskId);
        assertTaskOwnership(task, workerId);
        assertActionStatus(task, TaskActionStatus.ADJUST_QUANTITY);

        TaskItemVO item = taskItemMapper.findById(taskItemId);
        if (item == null || !"IN_PROGRESS".equals(item.getStatus())) {
            throw new InvalidItemStatusException();
        }

        // 증감 로직 적용 (기존 pickedQty + increment)
        int newQty = item.getPickedQty() + increment;

        if (newQty < 0 || newQty > item.getRequiredQty()) {
            throw new InvalidQuantityException();
        }

        taskItemMapper.setPickedQty(taskItemId, newQty);

        log.info("[TaskWorkflowService] Quantity adjusted - itemId={}, newQty={}", taskItemId, newQty);

        // 업데이트된 아이템 반환
        TaskItemVO updatedItem = taskItemMapper.findById(taskItemId);
        return TaskResponse.of(updatedItem,
                NextAction.ADJUST_QUANTITY);
    }

    // ========== 2.6 completeItem ==========

    @Transactional
    public TaskResponse<TaskItemVO> completeItem(Long workerId, Long taskId,
            Long taskItemId) {
        log.info("[TaskWorkflowService] completeItem - taskId={}, itemId={}", taskId, taskItemId);

        TaskVO task = taskMapper.findByIdForUpdate(taskId);
        assertTaskOwnership(task, workerId);

        // [FSM 보강] 이미 완료된 상태(COMPLETE_TASK)라면 즉시 완료 응답
        if (task.getActionStatus() == TaskActionStatus.COMPLETE_TASK) {
            return TaskResponse.of(taskItemMapper.findById(taskItemId),
                    NextAction.COMPLETE_TASK);
        }

        TaskItemVO item = taskItemMapper.findById(taskItemId);
        if (item == null) {
            throw new InvalidItemStatusException("Item not found");
        }

        // [FSM 보강] 이미 DONE이거나 ISSUE_PENDING(패스)인 경우 로직 스킵하고 다음 액션 계산
        if ("DONE".equals(item.getStatus()) || "ISSUE_PENDING".equals(item.getStatus())) {
            log.info("[TaskWorkflowService] Item already processed ({}). Calculating next action.", item.getStatus());
            NextAction nextAction = determineNextActionAfterPick(item);

            if (nextAction == NextAction.COMPLETE_TASK) {
                task.setActionStatus(TaskActionStatus.COMPLETE_TASK);
                taskMapper.updateTask(task);
            } else if (nextAction == NextAction.SCAN_LOCATION) {
                task.setActionStatus(TaskActionStatus.SCAN_LOCATION);
                taskMapper.updateTask(task);
            }
            return TaskResponse.of(item, nextAction);
        }

        assertActionStatus(task, TaskActionStatus.ADJUST_QUANTITY);

        if (!"IN_PROGRESS".equals(item.getStatus())) {
            throw new InvalidItemStatusException();
        }

        if (!item.getPickedQty().equals(item.getRequiredQty())) {
            throw new QuantityMismatchException();
        }

        taskItemMapper.updateStatus(taskItemId, "DONE");

        // 재고 차감 이벤트 기록 (workerId 명시적 전달)
        inventoryService.recordEvent(
                "PICK_NORMAL",
                item.getProductId(),
                item.getLocationId(),
                -item.getPickedQty(), // 음수 = 차감
                "TASK_ITEM",
                taskItemId,
                workerId); // workerId 명시적 전달

        // [Event] Redis 집계용 이벤트 발행
        eventPublisher.publishEvent(new TaskItemCompletedEvent(
                item.getBatchTaskItemId(),
                item.getBatchTaskId(),
                task.getZoneId(),
                task.getBatchId()));

        // NextAction 결정 (Facade 로직 통합)
        TaskItemVO completedItem = taskItemMapper.findById(taskItemId);
        NextAction nextAction = determineNextActionAfterPick(completedItem);

        if (nextAction == NextAction.COMPLETE_TASK) {
            task.setActionStatus(TaskActionStatus.COMPLETE_TASK);
        } else if (nextAction == NextAction.SCAN_LOCATION) {
            // 아이템 경계 → 항상 지번부터
            task.setActionStatus(TaskActionStatus.SCAN_LOCATION);
        }

        taskMapper.updateTask(task);

        log.info("[TaskWorkflowService] Item completed - itemId={}, inventory recorded", taskItemId);

        return TaskResponse.of(completedItem, nextAction);
    }

    // ========== 2.7 completeTask ==========

    @Transactional
    public void completeTask(Long workerId, Long taskId) {
        log.info("[TaskWorkflowService] completeTask - taskId={}", taskId);

        TaskVO task = taskMapper.findByIdForUpdate(taskId);
        assertTaskOwnership(task, workerId);

        // [멱등성 보강] 이미 COMPLETED인 경우 성공으로 간주하고 종료
        if ("COMPLETED".equals(task.getStatus())) {
            log.info("[TaskWorkflowService] Task already completed - taskId={}", taskId);
            return;
        }

        assertActionStatus(task, TaskActionStatus.COMPLETE_TASK);

        int pendingCount = taskItemMapper.countPendingItemsByTaskId(taskId);
        if (pendingCount > 0) {
            throw new PendingItemsExistException();
        }

        task.setStatus("COMPLETED");
        task.setActionStatus(TaskActionStatus.COMPLETE_TASK);
        task.setCompletedAt(LocalDateTime.now());
        taskMapper.updateTask(task);

        // [Event] Task 완료 이벤트 발행
        eventPublisher.publishEvent(new TaskCompletedEvent(
                task.getBatchTaskId(),
                task.getWorkerId(),
                task.getZoneId(),
                task.getBatchId()));

        // [Batch] 배치 내 모든 Task가 완료되었는지 확인하고 Batch 상태 업데이트
        int remainingTasks = taskMapper.countInProgressTasksByBatch(task.getBatchId());
        if (remainingTasks == 0) {
            log.info("[TaskWorkflowService] All tasks completed for batch {}. Updating batch status to COMPLETED.",
                    task.getBatchId());
            batchMapper.updateStatus(task.getBatchId(), "COMPLETED");
        }

        log.info("[TaskWorkflowService] Task completed - taskId={}", taskId);
    }

    // ========== 유틸리티 메서드 ==========

    /**
     * [조회] 작업자의 현재 진행 중인 작업 조회 (화면 복구용)
     * - 로그인 직후나 새로고침 시 호출되어, 작업자가 하던 단계로 되돌아갈 수 있게 합니다.
     */
    @Transactional(readOnly = true)
    public TaskResponse<TaskVO> getInProgressTask(Long workerId) {
        TaskVO task = taskMapper.findInProgressByWorkerId(workerId);
        if (task == null) {
            return null; // 진행 중인 작업 없음
        }

        // 상세 정보 조회를 위해 재조회
        TaskVO fullTask = taskMapper.findById(task.getBatchTaskId());

        // 다음 진행할 아이템 조회 (없을 수도 있음)
        TaskItemVO nextItem = taskItemService.getNextItem(fullTask.getBatchTaskId());

        // 현재 DB 상태에 맞는 NextAction 유추
        NextAction nextAction = resolveNextAction(fullTask.getActionStatus());

        // [BugFix] 현재 지번과 다음 아이템의 지번이 다르면 SCAN_LOCATION으로 강제 변경
        if (nextItem != null) {
            Long currentLocId = fullTask.getCurrentLocationId();
            Long nextLocId = nextItem.getLocationId();

            // 현재 지번이 없거나(초기상태), 다음 아이템 지번과 다르면 -> 지번 스캔부터 해야 함
            if (currentLocId == null || !currentLocId.equals(nextLocId)) {
                nextAction = NextAction.SCAN_LOCATION;
            }
        }

        return TaskResponse.of(fullTask, nextAction, nextItem);
    }

    /**
     * NextAction 결정 로직 (Facade 로직 통합)
     * - DONE, ISSUE, ISSUE_PENDING 상태 체크
     */
    private NextAction determineNextActionAfterPick(TaskItemVO item) {
        log.debug("[TaskWorkflowService] Determining next action for item {}. Status={}", item.getBatchTaskItemId(),
                item.getStatus());

        // DONE, ISSUE, ISSUE_PENDING 상태는 해당 아이템 처리가 끝난 것으로 간주
        if ("DONE".equals(item.getStatus()) || "ISSUE".equals(item.getStatus())
                || "ISSUE_PENDING".equals(item.getStatus())) {
            int totalPending = taskItemMapper.countPendingItemsByTaskId(item.getBatchTaskId());
            log.info("[TaskWorkflowService] Item Finished ({}). Total pending items for task {}: {}",
                    item.getStatus(), item.getBatchTaskId(), totalPending);

            if (totalPending == 0) {
                return NextAction.COMPLETE_TASK;
            }
            return NextAction.SCAN_LOCATION;
        }
        return NextAction.ADJUST_QUANTITY;
    }

    /**
     * TaskActionStatus를 NextAction으로 변환
     */
    private NextAction resolveNextAction(TaskActionStatus status) {
        if (status == null)
            return NextAction.NONE;
        switch (status) {
            case SCAN_TOTE:
                return NextAction.SCAN_TOTE;
            case SCAN_LOCATION:
                return NextAction.SCAN_LOCATION;
            case SCAN_ITEM:
                return NextAction.SCAN_ITEM;
            case ADJUST_QUANTITY:
                return NextAction.ADJUST_QUANTITY;
            case COMPLETE_TASK:
                return NextAction.COMPLETE_TASK;
            default:
                return NextAction.NONE;
        }
    }

    private void assertSingleInProgress(Long taskId) {
        int count = taskItemMapper.countInProgressItems(taskId);
        if (count > 1) {
            throw new InvalidItemStatusException();
        }
    }

    private void assertTaskOwnership(TaskVO task, Long workerId) {
        if (task == null) {
            throw new InvalidTaskStatusException();
        }
        if (!workerId.equals(task.getWorkerId())) {
            throw new InvalidTaskStatusException();
        }
    }

    private void assertTaskStatus(TaskVO task, String expectedStatus) {
        if (!expectedStatus.equals(task.getStatus())) {
            throw new InvalidTaskStatusException();
        }
    }

    private void assertActionStatus(TaskVO task, TaskActionStatus expectedActionStatus) {
        if (task.getActionStatus() != expectedActionStatus) {
            throw new InvalidActionStatusException();
        }
    }
}
