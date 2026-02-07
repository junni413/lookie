package lookie.backend.domain.issue.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "이슈 정렬 방식 (LATEST: 최신순, URGENCY: 긴급도순)")
public enum IssueSortType {
    LATEST,
    URGENCY
}
