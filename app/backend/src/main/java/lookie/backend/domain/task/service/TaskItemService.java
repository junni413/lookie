package lookie.backend.domain.task.service;

import lombok.RequiredArgsConstructor;
import lookie.backend.domain.task.exception.ItemQuantityExceededException;
import lookie.backend.domain.task.exception.TaskItemMismatchException;
import lookie.backend.domain.task.mapper.TaskItemMapper;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.product.mapper.ProductMapper;
import lookie.backend.domain.product.vo.ProductVO;
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

    /**
     * 상품 바코드 스캔 및 매칭되는 아이템 조회
     */
    public TaskItemVO scanAndGetItem(Long taskId, Long locationId, String barcode) {
        ProductVO product = productMapper.findByBarcode(barcode);
        if (product == null) {
            // 시스템에 없는 상품이거나 바코드가 틀린 경우 -> 상품 미일치로 처리
            throw new TaskItemMismatchException();
        }

        TaskItemVO item = taskItemMapper.findPendingOne(taskId, locationId, product.getProductId());
        if (item == null) {
            // 해당 지번에 이 상품이 할당되어 있지 않거나 이미 완료된 경우 -> 상품 미일치로 처리
            throw new TaskItemMismatchException();
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
            throw new lookie.backend.domain.task.exception.ItemQuantityNotSufficientException();
        }

        // 3. 상태 업데이트 (PENDING -> DONE)
        taskItemMapper.updateStatus(itemId, "DONE");

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
}
