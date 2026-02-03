package lookie.backend.domain.control.service;

import java.util.List;

import lookie.backend.domain.control.dto.DashboardSummaryDto;
import lookie.backend.domain.control.dto.ZoneOverviewDto;
import lookie.backend.domain.control.dto.WorkerHoverDto;

import lookie.backend.domain.control.dto.ZoneWorkerDto;

/**
 * 현장 관제(Control Map) 모니터링을 위한 서비스 인터페이스
 * 구역별 현황, 작업자 모니터링, 대시보드 요약 정보를 제공
 */
public interface WorkerMonitoringService {

    /**
     * 모든 구역(Zone)의 작업자 수와 진행률 현황을 조회합니다.
     *
     * @return 구역별 요약 정보 리스트
     */
    List<ZoneOverviewDto> getZoneOverviews();

    /**
     * 특정 구역에 배치된 작업자들의 상세 정보를 조회합니다.
     *
     * @param zoneId 조회할 구역 ID
     * @return 해당 구역의 작업자 리스트
     */
    List<ZoneWorkerDto> getWorkersByZone(Long zoneId);

    /**
     * 전체 관제 대시보드를 위한 시스템 요약 통계를 조회합니다.
     *
     * @return 대시보드 요약 정보 (전체 작업자 수, 이슈 현황 등)
     */

    DashboardSummaryDto getDashboardSummary();

    /**
     * 작업자 마우스 오버 시 정보를 조회합니다.
     *
     * @param workerId 작업자 ID
     * @return 작업자 호버 정보 DTO
     */
    WorkerHoverDto getWorkerHoverInfo(Long workerId);
}
