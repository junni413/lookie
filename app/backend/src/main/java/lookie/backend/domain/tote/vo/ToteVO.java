package lookie.backend.domain.tote.vo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ToteVO {
    private Long toteId;
    private Long currentBatchTaskId;
    private String barcode;
    private boolean isActive;
}
