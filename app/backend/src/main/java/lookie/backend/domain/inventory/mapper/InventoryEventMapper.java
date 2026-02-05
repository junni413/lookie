package lookie.backend.domain.inventory.mapper;

import lookie.backend.domain.inventory.vo.InventoryEventVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface InventoryEventMapper {
    
    /**
     * 재고 이벤트 기록
     */
    int insert(InventoryEventVO event);
    
    /**
     * 특정 상품+지번의 최근 이벤트 조회
     */
    List<InventoryEventVO> findRecentEvents(
        @Param("productId") Long productId,
        @Param("locationId") Long locationId,
        @Param("limit") int limit
    );
    
    /**
     * 이벤트 ID로 조회
     */
    InventoryEventVO findById(@Param("eventId") Long eventId);
}
