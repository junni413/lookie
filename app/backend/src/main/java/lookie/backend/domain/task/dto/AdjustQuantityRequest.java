package lookie.backend.domain.task.dto;

import lombok.Data;

/**
 * AdjustQuantityRequest - 수량 조정 요청 DTO
 */
@Data
public class AdjustQuantityRequest {
    private Integer pickedQty;
}
