package lookie.backend.domain.task.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "수량 조정 요청")
public class QuantityUpdateRequest {
    @Schema(description = "증가할 수량 (기본값 1)")
    private Integer increment;
}
