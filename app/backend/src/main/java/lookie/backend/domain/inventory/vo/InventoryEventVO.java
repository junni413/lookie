package lookie.backend.domain.inventory.vo;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Alias("InventoryEventVO")
public class InventoryEventVO {
    private Long eventId;
    private String eventType;
    private Long productId;
    private Long locationId;
    private Integer quantityChange;
    private String referenceType;
    private Long referenceId;
    private LocalDateTime createdAt;
    private Long createdBy;
}
