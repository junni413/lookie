package lookie.backend.domain.issue.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.NotNull;

@Getter
@Setter
public class AdminIssueListRequest {
    @NotNull(message = "Status is required (OPEN or RESOLVED)")
    @Schema(description = "Issue status", example = "OPEN")
    private IssueStatus status;

    @Schema(description = "Page number (1-based)", defaultValue = "1")
    private int page = 1;

    @Schema(description = "Page size", defaultValue = "10")
    private int size = 10;

    @Schema(description = "Sort type (LATEST or URGENCY)", defaultValue = "LATEST")
    private IssueSortType sortType = IssueSortType.LATEST;

    @Schema(description = "Optional zone filter (1:A, 2:B, 3:C, 4:D)")
    private Long zoneId;

    // Offset calculation for MyBatis
    public int getOffset() {
        return (page - 1) * size;
    }
}
