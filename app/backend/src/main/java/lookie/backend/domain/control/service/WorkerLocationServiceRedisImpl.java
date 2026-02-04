package lookie.backend.domain.control.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.control.dto.map.ZoneLineDto;
import lookie.backend.domain.control.dto.map.ZoneMapResponse;
import lookie.backend.domain.control.dto.map.ZoneWorkerLocationDto;
import lookie.backend.domain.control.mapper.ControlMapper;
import lookie.backend.domain.control.repository.ControlRedisRepository;
import lookie.backend.global.common.type.ZoneType;
import lookie.backend.global.util.WorkerNameFormatter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * WorkerLocationService의 Redis 기반 구현체
 * - Cache-Aside 패턴 적용
 * - @Primary 어노테이션으로 기본 구현체 설정
 * - 작업자 위치 및 병목 정보를 Redis에서 조회
 */
@Slf4j
@Service
@Primary
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkerLocationServiceRedisImpl implements WorkerLocationService {

    private final ControlRedisRepository redisRepository;
    private final ControlMapper controlMapper; // DB Fallback용

    // 병목 현상 판단 임계값 (설정 파일에서 주입)
    @Value("${control.bottleneck-threshold:120}")
    private int bottleneckThresholdSeconds;

    /**
     * 구역 맵 데이터 조회 (Cache-Aside 패턴)
     * 1. Redis에서 작업자 위치 조회 시도
     * 2. Cache Miss 시 DB 조회 → Redis 캐싱
     * 3. 라인 정보는 변경 빈도가 낮으므로 항상 DB 조회 (또는 별도 캐싱 전략)
     */
    @Override
    public ZoneMapResponse getZoneMap(Long zoneId) {
        log.debug("[Redis Service] Zone Map 조회 시작: zoneId={}", zoneId);

        // 1. Zone 이름 매핑
        String zoneName = ZoneType.getNameById(zoneId);

        // 2. 라인 정보 조회 (DB - 변경 빈도 낮음)
        List<ZoneLineDto> lines = controlMapper.selectLinesByZoneId(zoneId);

        // 3. 작업자 위치 조회 (Redis 우선)
        List<ZoneWorkerLocationDto> workers = getWorkerLocationsWithCache(zoneId);

        // 4. 응답 구성
        ZoneMapResponse response = ZoneMapResponse.builder()
                .zoneId(zoneId)
                .zoneName(zoneName)
                .lines(lines)
                .workers(workers)
                .build();

        log.info("[Redis Service] Zone Map 조회 완료: zoneId={}, workers={}", zoneId, workers.size());
        return response;
    }

    /**
     * 작업자 위치 조회 (Cache-Aside 패턴)
     * - Redis 조회 → Cache Miss 시 DB 조회 → Redis 캐싱
     */
    private List<ZoneWorkerLocationDto> getWorkerLocationsWithCache(Long zoneId) {
        // 1. Redis 조회 시도
        List<ZoneWorkerLocationDto> cached = redisRepository.getWorkerLocationsByZone(zoneId);

        if (cached != null && !cached.isEmpty()) {
            log.info("[Redis Service] Worker Locations 캐시 히트: zoneId={}, count={}", zoneId, cached.size());
            return cached;
        }

        // 2. Cache Miss → DB 조회
        log.info("[Redis Service] Worker Locations 캐시 미스 → DB 조회: zoneId={}", zoneId);
        List<ZoneWorkerLocationDto> fromDb = controlMapper.selectWorkerLocationsByZoneId(
                zoneId, bottleneckThresholdSeconds);

        // 3. 이름 포맷팅 및 Redis 캐싱
        for (ZoneWorkerLocationDto worker : fromDb) {
            worker.setName(WorkerNameFormatter.format(worker.getName(), worker.getPhoneNumber()));

            try {
                // 개별 작업자 위치 캐싱
                redisRepository.saveWorkerLocation(worker.getWorkerId(), worker);

                // 병목 작업자인 경우 Sorted Set에 추가
                if (Boolean.TRUE.equals(worker.getIsBottleneck())) {
                    // Score는 임계값 이상의 값으로 설정 (정확한 경과 시간은 DB에서 계산됨)
                    redisRepository.addBottleneckWorker(zoneId, worker.getWorkerId(),
                            bottleneckThresholdSeconds + 1);
                }
            } catch (Exception e) {
                log.error("[Redis Service] Worker Location 캐싱 실패: workerId={}, error={}",
                        worker.getWorkerId(), e.getMessage());
            }
        }

        log.info("[Redis Service] Worker Locations DB 조회 및 캐싱 완료: zoneId={}, count={}",
                zoneId, fromDb.size());
        return fromDb;
    }
}
