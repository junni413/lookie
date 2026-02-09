package lookie.backend.infra.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class Move {

    @JsonProperty("worker_id")
    private Long workerId;

    @JsonProperty("from_zone")
    private Long fromZone;

    @JsonProperty("to_zone")
    private Long toZone;

    private Double score;
    private String reason;
}
