package lookie.backend.domain.issue.vo;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Alias("IssueImageVO")
public class IssueImageVO {
    private Long issueImageId;
    private Long issueId;
    private String imageUrl;
    private LocalDateTime createdAt;
}
