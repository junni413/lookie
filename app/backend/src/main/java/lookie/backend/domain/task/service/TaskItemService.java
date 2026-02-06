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
     * [이슈] 아이템 상태를 ISSUE로 변경
     * - 작업 흐름상 완료로 간주됨 (DONE과 동일)
     */
    @Transactional
    public void markAsIssue(Long itemId) {
        taskItemMapper.updateStatus(itemId, "ISSUE");

        // [Event] 아이템 이슈 완료 이벤트 발행 (Redis 집계용)
        TaskItemVO item = taskItemMapper.findById(itemId);
        if (item != null) {
            eventPublisher.publishEvent(new TaskItemCompletedEvent(item.getBatchTaskItemId(), item.getBatchTaskId()));
        }
    }

    /**
     * [이슈] 아이템 단건 조회 (Issue 도메인 연계용)
     */
    public TaskItemVO getTaskItem(Long itemId) {
        return taskItemMapper.findById(itemId);
    }
}
