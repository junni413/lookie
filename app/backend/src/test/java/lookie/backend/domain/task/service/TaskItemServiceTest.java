package lookie.backend.domain.task.service;

import lookie.backend.domain.task.mapper.TaskItemMapper;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.product.mapper.ProductMapper;
import lookie.backend.domain.product.vo.ProductVO;
import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskItemServiceTest {

    @Mock
    private TaskItemMapper taskItemMapper;

    @Mock
    private ProductMapper productMapper;

    @Mock
    private lookie.backend.domain.inventory.service.InventoryService inventoryService;

    @InjectMocks
    private TaskItemService taskItemService;

    @Test
    @DisplayName("원자적 수량 업데이트 성공")
    void updateQuantityAtomic_Success() {
        // given
        Long itemId = 1L;
        when(taskItemMapper.updatePickedQuantityAtomic(itemId, 1)).thenReturn(1);
        when(taskItemMapper.findById(itemId)).thenReturn(new TaskItemVO());

        // when
        taskItemService.updateQuantityAtomic(itemId, 1);

        // then
        verify(taskItemMapper).updatePickedQuantityAtomic(itemId, 1);
    }

    @Test
    @DisplayName("원자적 수량 업데이트 실패: 수량 초과 또는 상태 부적절")
    void updateQuantityAtomic_Fail() {
        // given
        Long itemId = 1L;
        when(taskItemMapper.updatePickedQuantityAtomic(itemId, 1)).thenReturn(0);

        // when & then
        ApiException ex = assertThrows(ApiException.class, () -> {
            taskItemService.updateQuantityAtomic(itemId, 1);
        });
        assertEquals(ErrorCode.TASK_ITEM_QUANTITY_EXCEEDED, ex.getErrorCode());
    }

    @Test
    @DisplayName("상품 스캔 성공")
    void scanAndGetItem_Success() {
        // given
        Long taskId = 1L;
        Long locationId = 10L;
        String barcode = "P001";
        Long productId = 100L;

        ProductVO product = new ProductVO();
        product.setProductId(productId);

        TaskItemVO item = new TaskItemVO();
        item.setProductId(productId);
        item.setStatus("PENDING");

        when(productMapper.findByBarcode(barcode)).thenReturn(product);
        when(taskItemMapper.findPendingOne(taskId, locationId, productId)).thenReturn(item);

        // when
        TaskItemVO result = taskItemService.scanAndGetItem(taskId, locationId, barcode);

        // then
        assertEquals(productId, result.getProductId());
    }

    @Test
    @DisplayName("상품 스캔 실패: 상품 정보 없음")
    void scanAndGetItem_Fail_ProductNotFound() {
        // given
        when(productMapper.findByBarcode("WRONG")).thenReturn(null);

        // when & then
        ApiException ex = assertThrows(ApiException.class, () -> {
            taskItemService.scanAndGetItem(1L, 10L, "WRONG");
        });
        assertEquals(ErrorCode.PRODUCT_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("상품 스캔 실패: 현재 위치에 할당된 상품이 아님")
    void scanAndGetItem_Fail_ItemMismatch() {
        // given
        String barcode = "P001";
        ProductVO product = new ProductVO();
        product.setProductId(100L);

        when(productMapper.findByBarcode(barcode)).thenReturn(product);
        when(taskItemMapper.findPendingOne(anyLong(), anyLong(), eq(100L))).thenReturn(null);

        // when & then
        ApiException ex = assertThrows(ApiException.class, () -> {
            taskItemService.scanAndGetItem(1L, 10L, barcode);
        });
        assertEquals(ErrorCode.TASK_ITEM_NOT_ASSIGNED, ex.getErrorCode());
    }

    @Test
    @DisplayName("아이템 수동 완료 성공 - 작업자 ID 포함 재고 이벤트 확인")
    void completeItemManual_Success_WithWorkerId() {
        // given
        Long itemId = 1L;
        Long workerId = 100L;
        TaskItemVO item = new TaskItemVO();
        item.setBatchTaskItemId(itemId);
        item.setStatus("IN_PROGRESS");
        item.setProductId(500L);
        item.setLocationId(10L);
        item.setPickedQty(5);
        item.setRequiredQty(5);

        when(taskItemMapper.findById(itemId)).thenReturn(item);

        // when
        taskItemService.completeItemManual(itemId, workerId);

        // then
        verify(taskItemMapper).updateStatus(itemId, "DONE");
        verify(inventoryService).recordEvent(
                eq("PICK_NORMAL"),
                eq(500L),
                eq(10L),
                eq(-5),
                eq("TASK_ITEM"),
                eq(itemId),
                eq(workerId));
    }
}
