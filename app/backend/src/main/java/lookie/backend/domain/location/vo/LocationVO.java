package lookie.backend.domain.location.vo;

import lombok.Getter;
import lombok.Setter;
import org.apache.ibatis.type.Alias;

@Getter
@Setter
@Alias("LocationVO")
public class LocationVO {
    private Long locationId;
    private Long zoneId;
    private String locationCode;
}
