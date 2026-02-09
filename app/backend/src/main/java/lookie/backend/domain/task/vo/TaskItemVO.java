package lookie.backend.domain.task.vo;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Alias("TaskItemVO")
public class TaskItemVO {
    private Long batchTaskItemId;
    private Long batchTaskId;
    private Long productId;
    private Long locationId;
    private Integer requiredQty;
    private Integer pickedQty;
    private String status; // FSM 상태: PENDING, IN_PROGRESS, ISSUE_PENDING, DONE
    private LocalDateTime completedAt;
    private LocalDateTime lastScannedAt;

    // Join을 위한 추가 필드
    private String productName;
    private String productImage; // 상품 이미지 URL
    private String barcode;
    private String locationCode; // 지번 코드 (화면 표시용)

    // 이슈 상세 상태 노출용 (Join 필드)
    private String issueType;
    private String adminDecision;
}
