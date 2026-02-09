package lookie.backend.domain.issue.event;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lookie.backend.infra.ai.dto.AiAnalysisRequest;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class IssueRetakeRequestedEvent {
    private Long issueId;
    private Long productId;
    private String imageUrl;

    public AiAnalysisRequest toRequest() {
        return AiAnalysisRequest.of(issueId, productId, imageUrl);
    }
}
