package lookie.backend.infra.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAnalysisRequest {
    private String imageUrl;          // DAMAGED: 필수, OUT_OF_STOCK: null
    private Long issueId;
    private Long productId;
    private String issueType;         // "DAMAGED" 또는 "OUT_OF_STOCK"
    private InventoryStateDto inventoryState; // OUT_OF_STOCK인 경우 재고 상태 정보

    /**
     * DAMAGED 타입 이슈용 (레거시 호환)
     */
    public static AiAnalysisRequest of(Long issueId, Long productId, String imageUrl) {
        return AiAnalysisRequest.builder()
                .issueId(issueId)
                .productId(productId)
                .imageUrl(imageUrl)
                .issueType("DAMAGED")
                .build();
    }

    /**
     * 이슈 타입에 따라 적절한 요청 생성
     */
    public static AiAnalysisRequest create(
            Long issueId, 
            Long productId, 
            String issueType,
            String imageUrl, 
            InventoryStateDto inventoryState) {
        return AiAnalysisRequest.builder()
                .issueId(issueId)
                .productId(productId)
                .issueType(issueType)
                .imageUrl(imageUrl)
                .inventoryState(inventoryState)
                .build();
    }
}
