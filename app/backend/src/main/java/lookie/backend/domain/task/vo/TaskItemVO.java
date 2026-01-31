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
    private String status; // PENDING, DONE, ISSUE
    private LocalDateTime completedAt;
    private LocalDateTime lastScannedAt;

    // Join을 위한 추가 필드
    private String productName;
    private String barcode;
    private String locationCode; // 지번 코드 (화면 표시용)
}
