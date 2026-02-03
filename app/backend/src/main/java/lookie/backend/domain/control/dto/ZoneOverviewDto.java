package lookie.backend.domain.control.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoneOverviewDto {
    private Long zoneId;
    private String zoneName;
    private Integer workerCount;
    private Double progressRate;
    private String status;
}
