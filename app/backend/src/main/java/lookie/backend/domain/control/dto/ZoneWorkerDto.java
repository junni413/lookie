package lookie.backend.domain.control.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZoneWorkerDto {
    private Long workerId;
    private String name;
    private Integer workCount;
    private Double processingSpeed;
    private Double currentTaskProgress;
    private String status;
    private String webrtcStatus;

    @JsonIgnore
    private String phoneNumber;
}
