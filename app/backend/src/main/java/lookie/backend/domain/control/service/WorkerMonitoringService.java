package lookie.backend.domain.control.service;

import java.util.List;
import lookie.backend.domain.control.dto.ZoneOverviewDto;

import lookie.backend.domain.control.dto.ZoneWorkerDto;

public interface WorkerMonitoringService {
    List<ZoneOverviewDto> getZoneOverviews();

    List<ZoneWorkerDto> getWorkersByZone(Long zoneId);
}
