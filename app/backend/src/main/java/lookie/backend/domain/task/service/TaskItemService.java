package lookie.backend.domain.task.service;

import lombok.RequiredArgsConstructor;
import lookie.backend.domain.inventory.service.InventoryService;
import lookie.backend.domain.task.exception.ItemQuantityExceededException;
import lookie.backend.domain.task.exception.ItemQuantityNotSufficientException;
import lookie.backend.domain.product.exception.ProductNotFoundException;
import lookie.backend.domain.task.exception.TaskItemNotAssignedException;
import lookie.backend.domain.task.mapper.TaskItemMapper;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.product.mapper.ProductMapper;
import lookie.backend.domain.product.vo.ProductVO;
import lookie.backend.domain.task.event.TaskItemCompletedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * TaskItem(집품 아이템) 도메인 로직 처리 서비스
 */
@Service
@RequiredArgsConstructor
public class TaskItemService {

    private final TaskItemMapper taskItemMapper;
    private final ProductMapper productMapper;
    private final InventoryService inventoryService;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 상품 바코드 스캔 및 매칭되는 아이템 조회
     */
    public TaskItemVO scanAndGetItem(Long taskId, Long locationId, String barcode) {
        ProductVO product = productMapper.findByBarcode(barcode);
        if (product == null) {
            // 시스템에 없는 상품이거나 바코드가 틀린 경우
            throw new ProductNotFoundException();
        }

        TaskItemVO item = taskItemMapper.findPendingOne(taskId, locationId, product.getProductId());
        if (item == null) {
            // 해당 지번에 이 상품이 할당되어 있지 않거나 이미 완료된 경우
            throw new TaskItemNotAssignedException();
        }
        return item;
    }

    /**
     * 원자적 수량 업데이트 및 유효성 검사
     */
    @Transactional
    public TaskItemVO updateQuantityAtomic(Long itemId, int increment) {
        int affected = taskItemMapper.updatePickedQuantityAtomic(itemId, increment);
        if (affected == 0) {
            // WHERE 절 조건(status='PENDING' 및 picked_qty + increment <= required_qty)에 걸림
            throw new ItemQuantityExceededException();
        }
        return taskItemMapper.findById(itemId);
    }

    /**
     * [수동 완료] 상품 집품을 사용자가 직접 완료 처리
     * - 필수 조건: 집품 수량(pickedQty)이 목표 수량(requiredQty)과 일치해야 함
     * - DONE 확정 시 재고 차감 이벤트 발행 (PICK_NORMAL)
     */
    @Transactional
    public TaskItemVO completeItemManual(Long itemId) {
        TaskItemVO item = taskItemMapper.findById(itemId);

        // 1. 이미 완료된 경우 체크
        if ("DONE".equals(item.getStatus())) {
            return item;
        }

        // 2. 수량 충족 여부 체크
        if (!item.getPickedQty().equals(item.getRequiredQty())) {
            throw new ItemQuantityNotSufficientException();
        }

        // 3. 상태 업데이트 (PENDING -> DONE)
        taskItemMapper.updateStatus(itemId, "DONE");

        // 4. 재고 차감 이벤트 발행 (정상 집품 확정)
        inventoryService.recordEvent(
                "PICK_NORMAL",
                item.getProductId(),
                item.getLocationId(),
                -item.getRequiredQty(), // 음수 = 재고 감소
                "TASK_ITEM",
                itemId,
                null // workerId는 TaskWorkflowFacade에서 얻을 수 있지만, 여기서는 null
        );

        // 5. [Event] 아이템 완료 이벤트 발행 (Redis 집계용)
        eventPublisher.publishEvent(new TaskItemCompletedEvent(item.getBatchTaskItemId(), item.getBatchTaskId()));

        return taskItemMapper.findById(itemId);
    }

    public List<TaskItemVO> getPendingItemsAtLocation(Long taskId, Long locationId) {
        return taskItemMapper.findByTaskIdAndLocationId(taskId, locationId);
    }

    public int countPendingItems(Long taskId) {
        return taskItemMapper.countPendingItemsByTaskId(taskId);
    }

    public TaskItemVO getNextItem(Long taskId) {
        return taskItemMapper.findNextItem(taskId);
    }

    public List<TaskItemVO> getAllItems(Long taskId) {
        return taskItemMapper.findAllByTaskId(taskId);
    }

    /**
     * [이슈] 아이템 상태를 ISSUE_PENDING(보류)으로 변경
     * - 작업 흐름상 다음 아이템으로 넘어가도록 유도 (할일 카운트에서 제외됨)
     * - 하지만 pickedQty는 유지하여 나중에 복귀 가능
     */
    @Transactional
    public void markAsIssuePending(Long itemId) {
        taskItemMapper.updateStatus(itemId, "ISSUE_PENDING");
        // NOTE: ISSUE_PENDING은 가완료 상태이므로 TaskItemCompletedEvent를 발행하여
        // Redis 집계에 반영하고, 프론트가 다음 아이템으로 넘어가게 해야 함.
        TaskItemVO item = taskItemMapper.findById(itemId);
        if (item != null) {
            eventPublisher.publishEvent(new TaskItemCompletedEvent(item.getBatchTaskItemId(), item.getBatchTaskId()));
        }
    }

    /**
     * [이슈] 아이템 상태를 ISSUE(최종 완료)로 확정
     * - 파손 확정, 재고 없음 등으로 완전히 죽은 상태
     */
    @Transactional
    public void markAsIssueFinal(Long itemId) {
        taskItemMapper.updateStatus(itemId, "ISSUE");

        // [Inventory] 파손 확정 시 재고 차감 (결손 처리)
        // picked_qty와 무관하게 할당된 요구 수량 전체를 파손으로 간주하고 차감
        TaskItemVO item = taskItemMapper.findById(itemId);
        if (item != null) {
            inventoryService.recordEvent(
                    "PICK_DAMAGED_FINAL",
                    item.getProductId(),
                    item.getLocationId(),
                    -item.getRequiredQty(),
                    "TASK_ITEM",
                    itemId,
                    null // 시스템/관리자 확정이므로 workerId는 생략
            );
        }

        // 이미 PENDING -> ISSUE_PENDING 갈 때 이벤트를 발행했으므로
        // 여기서는 중복 발행할 필요가 있는지 체크 필요.
        // 현재 로직상 ISSUE_PENDING도 '완료' 취급이므로 추가 발행 불필요
    }

    /**
     * [이슈] 아이템 부활 (정상 복귀)
     * - ISSUE_PENDING -> PENDING
     * - pickedQty 등은 그대로 유지됨
     */
    @Transactional
    public void reviveItem(Long itemId) {
        taskItemMapper.updateStatus(itemId, "PENDING");

        // Redis 집계 정합성을 위해 Reverted 이벤트 발행 (-1 처리)
        TaskItemVO item = taskItemMapper.findById(itemId);
        if (item != null) {
            eventPublisher.publishEvent(new lookie.backend.domain.task.event.TaskItemRevertedEvent(
                    item.getBatchTaskItemId(), item.getBatchTaskId()));
        }
    }

    /**
     * [이슈] 지번 이동 처리
     */
    @Transactional
    public void updateItemLocation(Long itemId, Long newLocationId) {
        taskItemMapper.updateLocationOfItem(itemId, newLocationId);
    }

    /**
     * [이슈] 아이템 단건 조회 (Issue 도메인 연계용)
     */
    public TaskItemVO getTaskItem(Long itemId) {
        return taskItemMapper.findById(itemId);
    }
}
