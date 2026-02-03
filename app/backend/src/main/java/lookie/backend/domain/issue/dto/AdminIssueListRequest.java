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

    // Offset calculation for MyBatis
    public int getOffset() {
        return (page - 1) * size;
    }
}
