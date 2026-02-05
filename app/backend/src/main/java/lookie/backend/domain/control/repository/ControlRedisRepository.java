package lookie.backend.domain.control.repository;

import lookie.backend.domain.control.dto.DashboardSummaryDto;
import lookie.backend.domain.control.dto.ZoneOverviewDto;
import lookie.backend.domain.control.dto.ZoneWorkerDto;
import lookie.backend.domain.control.dto.map.ZoneWorkerLocationDto;

import java.util.List;

/**
 * Control 도메인 Redis Repository 인터페이스
 * - Zone, Worker, Dashboard 데이터를 Redis에 저장/조회
 * - Cache-Aside 패턴 지원
 */
public interface ControlRedisRepository {

    // ==================== Zone 관련 ====================

    /**
     * 구역 현황 정보를 Redis에 저장
     * 
     * @param zoneId 구역 ID
     * @param dto    구역 현황 DTO
     */
    void saveZoneOverview(Long zoneId, ZoneOverviewDto dto);

    /**
     * 구역 현황 정보를 Redis에서 조회
     * 
     * @param zoneId 구역 ID
     * @return 구역 현황 DTO (캐시 미스 시 null)
     */
    ZoneOverviewDto getZoneOverview(Long zoneId);

    /**
     * 모든 구역 현황 정보를 조회
     * 
     * @return 구역 현황 DTO 리스트 (캐시 미스 시 빈 리스트)
     */
    List<ZoneOverviewDto> getAllZoneOverviews();

    /**
     * 특정 구역의 캐시 삭제
     * 
     * @param zoneId 구역 ID
     */
    void deleteZoneCache(Long zoneId);

    // ==================== Worker 관련 ====================

    /**
     * 작업자 상태 정보를 Redis에 저장
     * 
     * @param workerId 작업자 ID
     * @param dto      작업자 상태 DTO
     */
    void saveWorkerStatus(Long workerId, ZoneWorkerDto dto);

    /**
     * 작업자 상태 정보를 Redis에서 조회
     * 
     * @param workerId 작업자 ID
     * @return 작업자 상태 DTO (캐시 미스 시 null)
     */
    ZoneWorkerDto getWorkerStatus(Long workerId);

    /**
     * 특정 구역의 모든 작업자 상태 조회
     * 
     * @param zoneId 구역 ID
     * @return 작업자 상태 DTO 리스트 (캐시 미스 시 빈 리스트)
     */
    List<ZoneWorkerDto> getWorkersByZone(Long zoneId);

    /**
     * 작업자 위치 정보를 Redis에 저장
     * 
     * @param workerId 작업자 ID
     * @param dto      작업자 위치 DTO
     */
    void saveWorkerLocation(Long workerId, ZoneWorkerLocationDto dto);

    /**
     * 작업자 위치 정보를 Redis에서 조회
     * 
     * @param workerId 작업자 ID
     * @return 작업자 위치 DTO (캐시 미스 시 null)
     */
    ZoneWorkerLocationDto getWorkerLocation(Long workerId);

    /**
     * 특정 구역의 모든 작업자 위치 조회
     * 
     * @param zoneId 구역 ID
     * @return 작업자 위치 DTO 리스트 (캐시 미스 시 빈 리스트)
     */
    List<ZoneWorkerLocationDto> getWorkerLocationsByZone(Long zoneId);

    /**
     * 작업자 캐시 삭제 (상태 + 위치)
     * 
     * @param workerId 작업자 ID
     */
    void deleteWorkerCache(Long workerId);

    // ==================== Bottleneck 관리 (Sorted Set) ====================

    /**
     * 병목 작업자를 Sorted Set에 추가
     * 
     * @param zoneId         구역 ID
     * @param workerId       작업자 ID
     * @param elapsedSeconds 작업 시작 후 경과 시간 (초)
     */
    void addBottleneckWorker(Long zoneId, Long workerId, long elapsedSeconds);

    /**
     * 병목 작업자를 Sorted Set에서 제거
     * 
     * @param zoneId   구역 ID
     * @param workerId 작업자 ID
     */
    void removeBottleneckWorker(Long zoneId, Long workerId);

    /**
     * 임계값 이상의 병목 작업자 ID 조회
     * 
     * @param zoneId           구역 ID
     * @param thresholdSeconds 임계값 (초)
     * @return 병목 작업자 ID 리스트
     */
    List<Long> getBottleneckWorkers(Long zoneId, int thresholdSeconds);

    /**
     * 특정 구역의 병목 순위 캐시 삭제
     * 
     * @param zoneId 구역 ID
     */
    void deleteBottleneckCache(Long zoneId);

    // ==================== Dashboard 관련 ====================

    /**
     * 대시보드 요약 정보를 Redis에 저장
     * 
     * @param dto 대시보드 요약 DTO
     */
    void saveDashboardSummary(DashboardSummaryDto dto);

    /**
     * 대시보드 요약 정보를 Redis에서 조회
     * 
     * @return 대시보드 요약 DTO (캐시 미스 시 null)
     */
    DashboardSummaryDto getDashboardSummary();

    /**
     * 대시보드 캐시 삭제
     */
    void deleteDashboardCache();

    // ==================== Utility ====================

    /**
     * Control 도메인의 모든 캐시 삭제
     */
    void deleteAllControlCache();
}
