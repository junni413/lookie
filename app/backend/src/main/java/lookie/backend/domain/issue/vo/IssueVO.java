package lookie.backend.domain.issue.vo;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Alias("IssueVO")
public class IssueVO {
    private Long issueId;
    private String issueType; // ENUM('DAMAGED','OUT_OF_STOCK')
    private String status; // ENUM('OPEN','RESOLVED')
    private String priority; // ENUM('LOW','MEDIUM','HIGH')
    private String reasonCode; // ENUM('DAMAGED','MOVE_LOCATION','WAITING_RETURN','STOCK_EXISTS','UNKNOWN')
    private String issueHandling; // ENUM('BLOCKING','NON_BLOCKING')
    private Boolean adminRequired;

    private Long workerId;
    private Long adminId;
    private Long batchTaskId;
    private Long batchTaskItemId;
    private Long zoneLocationId;

    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private String note;
}
