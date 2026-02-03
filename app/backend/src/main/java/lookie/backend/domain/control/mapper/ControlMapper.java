package lookie.backend.domain.control.mapper;

import java.util.List;
import lookie.backend.domain.control.dto.ZoneOverviewDto;
import lookie.backend.domain.control.dto.ZoneWorkerDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ControlMapper {
    List<ZoneOverviewDto> selectZoneOverviews();

    List<ZoneWorkerDto> selectWorkersByZoneId(@Param("zoneId") Long zoneId);
}
