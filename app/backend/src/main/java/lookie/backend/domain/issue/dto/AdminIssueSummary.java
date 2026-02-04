package lookie.backend.domain.issue.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminIssueSummary {
    private Long issueId;
    private String issueType; // DAMAGED, OUT_OF_STOCK
    private String status; // OPEN, RESOLVED
    private Integer urgency; // 1(High) ~ 5(Low)
    private String aiDecision; // Latest AI Judgment
    private String adminDecision; // Only for RESOLVED

    // Worker Info
    private Long workerId;
    private String workerName;

    // Product Info
    private String productName;

    // Location Info
    private String locationCode; // e.g. "A-01-02"

    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
}
