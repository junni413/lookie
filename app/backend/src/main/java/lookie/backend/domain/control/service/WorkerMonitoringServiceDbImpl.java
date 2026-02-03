package lookie.backend.domain.control.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.control.dto.DashboardSummaryDto;
import lookie.backend.domain.control.dto.ZoneOverviewDto;
import lookie.backend.domain.control.dto.ZoneWorkerDto;
import lookie.backend.domain.control.mapper.ControlMapper;
import lookie.backend.global.common.type.ZoneType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * WorkerMonitoringService의 DB 기반 구현체
 * <p>
 * MyBatis를 사용하여 MySQL DB에서 관제 데이터를 직접 조회합니다.
 * 추후 Redis 기반 구현체로 전환 시 이 클래스는 Deprecated 될 수 있습니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkerMonitoringServiceDbImpl implements WorkerMonitoringService {

    private final ControlMapper controlMapper;

    /**
     * 구역별 현황 조회 구현
     * <p>
     * 1. DB에서 Zone ID 및 통계 데이터를 조회합니다.
     * 2. ZoneType Enum을 사용하여 Zone ID를 사람이 읽을 수 있는 이름('ZONE A' 등)으로 변환합니다.
     */
    @Override
    public List<ZoneOverviewDto> getZoneOverviews() {
        List<ZoneOverviewDto> overviews = controlMapper.selectZoneOverviews();

        // Map zoneName using Enum
        // DB에는 ID만 있으므로, Enum을 통해 'ZONE A' 같은 표시용 이름으로 매핑합니다.
        for (ZoneOverviewDto dto : overviews) {
            dto.setZoneName(ZoneType.getNameById(dto.getZoneId()));
        }

        return overviews;
    }

    /**
     * 구역별 작업자 조회 구현
     * <p>
     * 1. 해당 구역의 작업자 리스트를 조회합니다.
     * 2. 개인정보 보호를 위해 이름을 '실명 + 전화번호 뒷 4자리' 형식(예: 홍길동 1234)으로 포맷팅합니다.
     */
    @Override
    public List<ZoneWorkerDto> getWorkersByZone(Long zoneId) {
        List<ZoneWorkerDto> workers = controlMapper.selectWorkersByZoneId(zoneId);

        for (ZoneWorkerDto worker : workers) {
            // Format name: "Name 1234"
            // 동명이인 구분을 위해 이름 뒤에 전화번호 뒷자리를 붙입니다.
            String originalName = worker.getName();
            String phoneNumber = worker.getPhoneNumber();

            if (originalName != null && phoneNumber != null && phoneNumber.length() >= 4) {
                String last4Digits = phoneNumber.substring(phoneNumber.length() - 4);
                worker.setName(originalName + " " + last4Digits);
            }
        }

        return workers;
    }

    /**
     * 대시보드 요약 조회 구현
     * <p>
     * 1. Mapper를 통해 전체 작업자 수, 이슈 통계 등을 각각 카운트합니다.
     * 2. 구역별 현황은 기존 getZoneOverviews() 로직과 동일하게 Enum 매핑을 수행하여 리스트에 포함합니다.
     */
    @Override
    public DashboardSummaryDto getDashboardSummary() {
        // 1. Fetch System Metrics (시스템 전체 지표 조회)
        Integer totalActiveWorkers = controlMapper.countTotalActiveWorkers();
        Integer pendingIssues = controlMapper.countPendingIssues();
        Integer completedIssues = controlMapper.countTodayCompletedIssues();

        // 2. Fetch Zone Summaries (Reuse existing logic)
        // 구역별 요약 정보 재사용 (Enum 매핑 로직 포함)
        List<ZoneOverviewDto> zoneSummaries = controlMapper.selectZoneOverviews();
        for (ZoneOverviewDto dto : zoneSummaries) {
            dto.setZoneName(ZoneType.getNameById(dto.getZoneId()));
        }

        // 3. Build DTO (결과 취합)
        return DashboardSummaryDto.builder()
                .totalActiveWorkers(totalActiveWorkers != null ? totalActiveWorkers : 0)
                .pendingIssues(pendingIssues != null ? pendingIssues : 0)
                .completedIssues(completedIssues != null ? completedIssues : 0)
                .totalProgressRate(0.0) // 현재는 0.0으로 하드코딩 (추후 구현 예정)
                .zoneSummaries(zoneSummaries)
                .build();
    }
}
