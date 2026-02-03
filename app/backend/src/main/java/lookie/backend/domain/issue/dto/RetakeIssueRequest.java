package lookie.backend.domain.issue.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class RetakeIssueRequest {
    private String imageUrl; // 재촬영된 이미지 URL
}
