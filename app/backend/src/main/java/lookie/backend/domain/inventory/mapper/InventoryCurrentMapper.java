package lookie.backend.domain.inventory.mapper;

import lookie.backend.domain.inventory.vo.InventoryCurrentVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface InventoryCurrentMapper {
    
    /**
     * 현재 재고 상태 조회
     */
    InventoryCurrentVO selectCurrent(
        @Param("productId") Long productId,
        @Param("locationId") Long locationId
    );
    
    /**
     * 현재 재고 상태 초기 생성
     */
    int insert(InventoryCurrentVO current);
    
    /**
     * 이벤트 적용하여 재고 상태 업데이트
     */
    int applyEvent(
        @Param("productId") Long productId,
        @Param("locationId") Long locationId,
        @Param("eventType") String eventType,
        @Param("quantityChange") int quantityChange,
        @Param("eventId") Long eventId,
        @Param("updatedBy") Long updatedBy
    );
    
    /**
     * 전체 재고 목록 조회 (페이징)
     */
    int selectAll(
        @Param("offset") int offset,
        @Param("limit") int limit
    );
}
