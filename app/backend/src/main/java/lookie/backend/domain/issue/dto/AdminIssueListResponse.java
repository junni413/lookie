package lookie.backend.domain.issue.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminIssueListResponse {
    private List<AdminIssueSummary> issues;
    private PaginationInfo paging;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaginationInfo {
        private int page;
        private int size;
        private long totalCount;
        private int totalPages;
    }

    public static AdminIssueListResponse of(List<AdminIssueSummary> issues, int page, int size, long totalCount) {
        int totalPages = (int) Math.ceil((double) totalCount / size);
        return AdminIssueListResponse.builder()
                .issues(issues)
                .paging(PaginationInfo.builder()
                        .page(page)
                        .size(size)
                        .totalCount(totalCount)
                        .totalPages(totalPages)
                        .build())
                .build();
    }
}
