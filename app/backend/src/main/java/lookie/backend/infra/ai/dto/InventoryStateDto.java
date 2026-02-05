package lookie.backend.infra.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AI 서버로 전달할 재고 상태 정보 (OUT_OF_STOCK 판단용)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryStateDto {
    /**
     * 가용 재고 수량
     */
    private Integer availableQty;
    
    /**
     * 파손 임시 처리 중인 수량
     */
    private Integer damagedTempQty;
    
    /**
     * 작업자가 스캔한 위치 (예: "A-01-05")
     */
    private String scannedLocation;
    
    /**
     * 시스템에 등록된 기본 위치 (예: "A-01-01")
     */
    private String expectedLocation;
    
    /**
     * 마지막 재고 이벤트 타입 (예: "PICK_DAMAGED_TEMP", "REVERT_DAMAGED")
     * AI가 원복 대기(WAITING_RETURN) 등의 상태를 판단하는 데 사용
     */
    private String lastEventType;
}
