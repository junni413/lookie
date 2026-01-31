package lookie.backend.domain.task.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "지번 스캔 요청")
public class LocationScanRequest {
    @Schema(description = "지번 코드")
    private String locationCode;
}
