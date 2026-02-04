package lookie.backend.domain.control.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.control.dto.map.ZoneLineDto;
import lookie.backend.domain.control.dto.map.ZoneMapResponse;
import lookie.backend.domain.control.dto.map.ZoneWorkerLocationDto;
import lookie.backend.domain.control.mapper.ControlMapper;
import lookie.backend.global.common.type.ZoneType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import lookie.backend.global.util.WorkerNameFormatter;

/**
 * WorkerLocationService의 DB 기반 구현체
 * MyBatis를 사용하여 MySQL DB에서 실시간 위치 데이터를 조회합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkerLocationServiceDbImpl implements WorkerLocationService {

    private final ControlMapper controlMapper;

    // 병목 현상 판단 임계값 (설정 파일에서 주입)
    @Value("${control.bottleneck-threshold:120}")
    private int bottleneckThresholdSeconds;

    /**
     * 구역 맵 데이터 조회 구현
     * <p>
     * 1. 구역 이름 조회 (Enum 사용)
     * 2. 구역 내 라인 목록 조회
     * 3. 구역 내 작업자 실시간 위치 및 병목 여부 조회
     * 4. 작업자 이름 포맷팅 (이름 + 전화번호 뒷 4자리)
     * 5. 결과 조합하여 반환
     */
    @Override
    public ZoneMapResponse getZoneMap(Long zoneId) {
        // 1. Zone Name Mapping
        String zoneName = ZoneType.getNameById(zoneId);

        // 2. Fetch Lines
        List<ZoneLineDto> lines = controlMapper.selectLinesByZoneId(zoneId);

        // 3. Fetch Worker Locations with Bottleneck Check
        List<ZoneWorkerLocationDto> workers = controlMapper
                .selectWorkerLocationsByZoneId(zoneId, bottleneckThresholdSeconds);

        // 4. Format Worker Names
        for (ZoneWorkerLocationDto worker : workers) {
            worker.setName(WorkerNameFormatter.format(worker.getName(), worker.getPhoneNumber()));
        }

        // 5. Build Response
        return ZoneMapResponse.builder()
                .zoneId(zoneId)
                .zoneName(zoneName)
                .lines(lines)
                .workers(workers)
                .build();
    }
}
