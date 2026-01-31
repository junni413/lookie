package lookie.backend.domain.task.service;

import lookie.backend.domain.task.mapper.TaskItemMapper;
import lookie.backend.domain.task.vo.TaskItemVO;
import lookie.backend.domain.product.mapper.ProductMapper;
import lookie.backend.domain.product.vo.ProductVO;
import lookie.backend.domain.product.exception.ProductNotFoundException;
import lookie.backend.domain.task.exception.ItemNotFoundException;
import lookie.backend.domain.task.exception.ItemQuantityExceededException;
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
        assertThrows(ItemQuantityExceededException.class, () -> {
            taskItemService.updateQuantityAtomic(itemId, 1);
        });
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
}
