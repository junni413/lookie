package lookie.backend.domain.control.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.control.dto.ZoneOverviewDto;
import lookie.backend.domain.control.dto.ZoneWorkerDto;
import lookie.backend.domain.control.mapper.ControlMapper;
import lookie.backend.global.common.type.ZoneType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkerMonitoringServiceDbImpl implements WorkerMonitoringService {

    private final ControlMapper controlMapper;

    @Override
    public List<ZoneOverviewDto> getZoneOverviews() {
        List<ZoneOverviewDto> overviews = controlMapper.selectZoneOverviews();

        // Map zoneName using Enum
        for (ZoneOverviewDto dto : overviews) {
            dto.setZoneName(ZoneType.getNameById(dto.getZoneId()));
        }

        return overviews;
    }

    @Override
    public List<ZoneWorkerDto> getWorkersByZone(Long zoneId) {
        List<ZoneWorkerDto> workers = controlMapper.selectWorkersByZoneId(zoneId);

        for (ZoneWorkerDto worker : workers) {
            // Format name: "Name 1234"
            String originalName = worker.getName();
            String phoneNumber = worker.getPhoneNumber();

            if (originalName != null && phoneNumber != null && phoneNumber.length() >= 4) {
                String last4Digits = phoneNumber.substring(phoneNumber.length() - 4);
                worker.setName(originalName + " " + last4Digits);
            }
        }

        return workers;
    }
}
