package lookie.backend.domain.location.mapper;

import lookie.backend.domain.location.vo.LocationVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface LocationMapper {
    // 지번 코드로 위치 정보 조회
    LocationVO findByCode(@Param("locationCode") String locationCode);
}
