package lookie.backend.domain.issue.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.NotNull;

@Getter
@Setter
public class AdminIssueListRequest {
    @NotNull(message = "Status is required (OPEN or RESOLVED)")
    @Schema(description = "이슈 상태 (OPEN: 대기, RESOLVED: 완료)", example = "OPEN")
    private IssueStatus status;

    @Schema(description = "페이지 번호 (1부터 시작)", defaultValue = "1")
    private int page = 1;

    @Schema(description = "페이지 크기", defaultValue = "10")
    private int size = 10;

    @Schema(description = "정렬 방식 (LATEST: 최신순, URGENCY: 긴급도순)", defaultValue = "LATEST")
    private IssueSortType sortType = IssueSortType.LATEST;

    // Offset calculation for MyBatis
    public int getOffset() {
        return (page - 1) * size;
    }
}
