package lookie.backend.domain.task.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "토트 스캔 요청")
public class ToteScanRequest {
    @Schema(description = "토트 바코드")
    private String barcode;
}
