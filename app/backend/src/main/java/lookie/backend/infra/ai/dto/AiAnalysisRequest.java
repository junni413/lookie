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
    private String imageUrl;
    private Long issueId;
    private Long productId;

    public static AiAnalysisRequest of(Long issueId, Long productId, String imageUrl) {
        return AiAnalysisRequest.builder()
                .issueId(issueId)
                .productId(productId)
                .imageUrl(imageUrl)
                .build();
    }
}
