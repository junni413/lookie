package lookie.backend.domain.task.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.location.mapper.LocationMapper;
import lookie.backend.domain.location.vo.LocationVO;
import lookie.backend.domain.product.mapper.ProductMapper;
import lookie.backend.domain.product.vo.ProductVO;
import lookie.backend.domain.task.vo.TaskActionStatus;
import lookie.backend.domain.task.exception.*;
import lookie.backend.domain.location.exception.LocationNotFoundException;
import lookie.backend.domain.task.mapper.TaskItemMapper;
import lookie.backend.domain.task.mapper.TaskMapper;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.task.vo.TaskVO;
import lookie.backend.domain.tote.mapper.ToteMapper;
import lookie.backend.domain.tote.vo.ToteVO;
import lookie.backend.domain.inventory.service.InventoryService;
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
    private final LocationMapper locationMapper;
    private final ProductMapper productMapper;
    private final ToteMapper toteMapper;
    private final InventoryService inventoryService;

    // ========== 2.1 assignTask / scanTote ==========

    @Transactional
    public void assignTask(Long workerId, Long zoneId) {
        log.info("[TaskWorkflowService] assignTask - workerId={}, zoneId={}", workerId, zoneId);

        TaskVO task = taskMapper.findNextUnassignedForZoneForUpdate(zoneId);
        if (task == null) {
            throw new NoPickableItemException();
        }

        taskMapper.updateAssignToInProgress(task.getBatchTaskId(), workerId);
        taskMapper.updateActionStatus(task.getBatchTaskId(), TaskActionStatus.SCAN_TOTE);

        log.info("[TaskWorkflowService] Task assigned - taskId={}", task.getBatchTaskId());
    }

    @Transactional
    public void scanTote(Long workerId, Long taskId, String toteBarcode) {
        log.info("[TaskWorkflowService] scanTote - taskId={}, toteBarcode={}", taskId, toteBarcode);

        TaskVO task = taskMapper.findByIdForUpdate(taskId);
        assertTaskOwnership(task, workerId);
        assertTaskStatus(task, "IN_PROGRESS");
        assertActionStatus(task, TaskActionStatus.SCAN_TOTE);

        ToteVO tote = toteMapper.findByBarcode(toteBarcode);
        if (tote == null) {
            throw new ToteNotFoundException();
        }

        task.setToteId(tote.getToteId());
        task.setActionStatus(TaskActionStatus.SCAN_LOCATION);
        taskMapper.updateTask(task);

        log.info("[TaskWorkflowService] Tote scanned - taskId={}, toteId={}", taskId, tote.getToteId());
    }

    // ========== 2.2 scanLocation ==========

    @Transactional
    public void scanLocation(Long workerId, Long taskId, String locationCode) {
        log.info("[TaskWorkflowService] scanLocation - taskId={}, locationCode={}", taskId, locationCode);

        TaskVO task = taskMapper.findByIdForUpdate(taskId);
        assertTaskOwnership(task, workerId);
        assertTaskStatus(task, "IN_PROGRESS");
        assertActionStatus(task, TaskActionStatus.SCAN_LOCATION);

        LocationVO location = locationMapper.findByCode(locationCode);
        if (location == null) {
            throw new LocationNotFoundException();
        }

        TaskItemVO nextItem = findNextPickableItem(taskId);
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
        taskMapper.updateTask(task);

        log.info("[TaskWorkflowService] Location scanned - taskId={}, locationId={}", taskId, location.getLocationId());
    }

    // ========== 2.4 scanItem ==========

    @Transactional
    public lookie.backend.domain.task.dto.TaskResponse<TaskItemVO> scanItem(Long workerId, Long taskId,
            String productBarcode) {
        log.info("[TaskWorkflowService] scanItem - taskId={}, productBarcode={}", taskId, productBarcode);

        TaskVO task = taskMapper.findByIdForUpdate(taskId);
        assertTaskOwnership(task, workerId);
        assertTaskStatus(task, "IN_PROGRESS");
        assertActionStatus(task, TaskActionStatus.SCAN_ITEM);

        assertSingleInProgress(taskId);

        TaskItemVO nextItem = findNextPickableItem(taskId);
        if (nextItem == null) {
            throw new NoPickableItemException();
        }

        ProductVO product = productMapper.findByBarcode(productBarcode);
        if (product == null || !product.getProductId().equals(nextItem.getProductId())) {
            throw new ItemMismatchException();
        }

        taskItemMapper.updateStatus(nextItem.getBatchTaskItemId(), "IN_PROGRESS");
        taskItemMapper.setPickedQty(nextItem.getBatchTaskItemId(), 0);

        task.setActionStatus(TaskActionStatus.ADJUST_QUANTITY);
        taskMapper.updateTask(task);

        log.info("[TaskWorkflowService] Item scanned - taskId={}, itemId={}", taskId, nextItem.getBatchTaskItemId());

        // 업데이트된 아이템 재조회하여 반환
        TaskItemVO updatedItem = taskItemMapper.findById(nextItem.getBatchTaskItemId());
        return lookie.backend.domain.task.dto.TaskResponse.of(updatedItem,
                lookie.backend.domain.task.constant.NextAction.ADJUST_QUANTITY);
    }

    // ========== 2.5 adjustQuantity ==========

    @Transactional
    public lookie.backend.domain.task.dto.TaskResponse<TaskItemVO> adjustQuantity(Long workerId, Long taskId,
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
        return lookie.backend.domain.task.dto.TaskResponse.of(updatedItem,
                lookie.backend.domain.task.constant.NextAction.ADJUST_QUANTITY);
    }

    // ========== 2.6 completeItem ==========

    @Transactional
    public lookie.backend.domain.task.dto.TaskResponse<TaskItemVO> completeItem(Long workerId, Long taskId,
            Long taskItemId) {
        log.info("[TaskWorkflowService] completeItem - taskId={}, itemId={}", taskId, taskItemId);

        TaskVO task = taskMapper.findByIdForUpdate(taskId);
        assertTaskOwnership(task, workerId);

        // [FSM 보강] 이미 완료된 상태(COMPLETE_TASK)라면 즉시 완료 응답
        if (task.getActionStatus() == TaskActionStatus.COMPLETE_TASK) {
            return lookie.backend.domain.task.dto.TaskResponse.of(taskItemMapper.findById(taskItemId),
                    lookie.backend.domain.task.constant.NextAction.COMPLETE_TASK);
        }

        TaskItemVO item = taskItemMapper.findById(taskItemId);
        if (item == null) {
            throw new InvalidItemStatusException("Item not found");
        }

        // [FSM 보강] 이미 DONE이거나 ISSUE_PENDING(패스)인 경우 로직 스킵하고 다음 액션 계산
        if ("DONE".equals(item.getStatus()) || "ISSUE_PENDING".equals(item.getStatus())) {
            log.info("[TaskWorkflowService] Item already processed ({}). Calculating next action.", item.getStatus());
            TaskItemVO nextItem = findNextPickableItem(taskId);
            lookie.backend.domain.task.constant.NextAction nextAction = (nextItem == null)
                    ? lookie.backend.domain.task.constant.NextAction.COMPLETE_TASK
                    : lookie.backend.domain.task.constant.NextAction.SCAN_LOCATION;

            if (nextAction == lookie.backend.domain.task.constant.NextAction.COMPLETE_TASK) {
                task.setActionStatus(TaskActionStatus.COMPLETE_TASK);
                taskMapper.updateTask(task);
            }
            return lookie.backend.domain.task.dto.TaskResponse.of(item, nextAction);
        }

        assertActionStatus(task, TaskActionStatus.ADJUST_QUANTITY);

        if (!"IN_PROGRESS".equals(item.getStatus())) {
            throw new InvalidItemStatusException();
        }

        if (!item.getPickedQty().equals(item.getRequiredQty())) {
            throw new QuantityMismatchException();
        }

        taskItemMapper.updateStatus(taskItemId, "DONE");

        // 재고 차감 이벤트 기록 (Pseudo Code 2.6)
        inventoryService.recordEvent(
                "PICK_NORMAL",
                item.getProductId(),
                item.getLocationId(),
                -item.getPickedQty(), // 음수 = 차감
                "TASK_ITEM",
                taskItemId,
                workerId);

        TaskItemVO nextItem = findNextPickableItem(taskId);
        lookie.backend.domain.task.constant.NextAction nextAction;

        if (nextItem == null) {
            task.setActionStatus(TaskActionStatus.COMPLETE_TASK);
            nextAction = lookie.backend.domain.task.constant.NextAction.COMPLETE_TASK;
        } else {
            // 아이템 경계 → 항상 지번부터
            task.setActionStatus(TaskActionStatus.SCAN_LOCATION);
            nextAction = lookie.backend.domain.task.constant.NextAction.SCAN_LOCATION;
        }

        taskMapper.updateTask(task);

        log.info("[TaskWorkflowService] Item completed - itemId={}, inventory recorded", taskItemId);

        // 완료된 아이템 반환
        TaskItemVO completedItem = taskItemMapper.findById(taskItemId);
        return lookie.backend.domain.task.dto.TaskResponse.of(completedItem, nextAction);
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
        task.setCompletedAt(java.time.LocalDateTime.now());
        taskMapper.updateTask(task);

        log.info("[TaskWorkflowService] Task completed - taskId={}", taskId);
    }

    // ========== 유틸리티 메서드 ==========

    private TaskItemVO findNextPickableItem(Long taskId) {
        return taskItemMapper.findNextItem(taskId);
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
