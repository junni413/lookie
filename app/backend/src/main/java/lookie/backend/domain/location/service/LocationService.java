package lookie.backend.domain.location.service;

import lombok.RequiredArgsConstructor;
import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;
import lookie.backend.domain.location.mapper.LocationMapper;
import lookie.backend.domain.location.vo.LocationVO;
import org.springframework.stereotype.Service;

/**
 * Location(지번) 도메인 로직 처리 서비스
 */
@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationMapper locationMapper;

    public LocationVO getByCode(String code) {
        LocationVO location = locationMapper.findByCode(code);
        if (location == null) {
            throw new ApiException(ErrorCode.LOCATION_NOT_FOUND);
        }
        return location;
    }

    /**
     * 지번이 배정된 구역에 속하는지 검증
     */
    public void validateZone(LocationVO location, Long zoneId) {
        if (!location.getZoneId().equals(zoneId)) {
            throw new ApiException(ErrorCode.LOCATION_ZONE_MISMATCH);
        }
    }
}
