package lookie.backend.domain.issue.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyIssueSummary {
    private Long issueId;
    private String issueType;
    private String status;
    private String productName;
    private String locationCode;
    private String aiDecision;
    private Boolean adminRequired;
    private LocalDateTime createdAt;
}
