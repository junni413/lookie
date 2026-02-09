package lookie.backend.domain.inventory.vo;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Alias("InventoryCurrentVO")
public class InventoryCurrentVO {
    private Long productId;
    private Long locationId;
    private Integer availableQty;
    private Integer damagedTempQty;
    private Long lastEventId;
    private String lastEventType;
    private LocalDateTime updatedAt;
    private Long updatedBy;
}
