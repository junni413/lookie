package lookie.backend.domain.zone.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ZoneAssignmentMapper {
    // [조회]
    Long findZoneIdByWorkerId(@Param("workerId") Long workerId);
}
