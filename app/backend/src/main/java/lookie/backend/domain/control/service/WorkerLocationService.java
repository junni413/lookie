package lookie.backend.domain.control.service;

import lookie.backend.domain.control.dto.map.ZoneMapResponse;

/**
 * 작업자의 실시간 위치 및 그리드 맵 데이터를 제공하는 서비스 인터페이스
 * 추후 Redis 기반 구현체로 확장 가능성을 고려하여 설계
 */
public interface WorkerLocationService {

    /**
     * 특정 구역의 그리드 맵 데이터(라인, 작업자 위치 등)를 조회합니다.
     *
     * @param zoneId 구역 ID
     * @return 구역 상세 맵 응답 DTO
     */
    ZoneMapResponse getZoneMap(Long zoneId);
}
