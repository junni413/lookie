package lookie.backend.domain.control.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.control.dto.*;
import lookie.backend.domain.control.mapper.ControlMapper;
import lookie.backend.domain.control.repository.ControlRedisRepository;
import lookie.backend.domain.control.repository.vo.AdminQueryVo;
import lookie.backend.domain.user.service.UserService;
import lookie.backend.domain.user.vo.UserVO;
import lookie.backend.global.common.type.ZoneType;
import lookie.backend.global.util.WorkerNameFormatter;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * WorkerMonitoringService의 Redis 기반 구현체
 * - Cache-Aside 패턴 적용: Redis 조회 → Cache Miss 시 DB Fallback → Redis 캐싱
 * - @Primary 어노테이션으로 기본 구현체 설정
 * - 기존 DB 구현체(WorkerMonitoringServiceDbImpl)는 유지 (Fallback 및 비교용)
 */
@Slf4j
@Service
@Primary
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkerMonitoringServiceRedisImpl implements WorkerMonitoringService {

    private final ControlRedisRepository redisRepository;
    private final ControlMapper controlMapper; // DB Fallback용
    private final UserService userService; // 실시간 상태 주입용

    /**
     * 구역별 현황 조회 (Cache-Aside 패턴)
     * 1. Redis 조회 시도
     * 2. Cache Hit → 즉시 반환
     * 3. Cache Miss → DB 조회 → Redis 캐싱 → 반환
     */
    @Override
    public List<ZoneOverviewDto> getZoneOverviews() {
        log.debug("[Redis Service] Zone Overviews 조회 시작");

        // 1. Redis 조회 시도
        List<ZoneOverviewDto> cached = redisRepository.getAllZoneOverviews();

        if (cached != null && !cached.isEmpty()) {
            log.info("[Redis Service] Zone Overviews 캐시 히트: count={}", cached.size());
            return cached;
        }

        // 2. Cache Miss → DB 조회
        log.info("[Redis Service] Zone Overviews 캐시 미스 → DB 조회");
        List<ZoneOverviewDto> fromDb = controlMapper.selectZoneOverviews();

        // 3. Enum 매핑 (기존 로직 유지)
        for (ZoneOverviewDto dto : fromDb) {
            dto.setZoneName(ZoneType.getNameById(dto.getZoneId()));
        }

        // 4. Redis에 캐싱 (Cache Warm-up)
        for (ZoneOverviewDto dto : fromDb) {
            try {
                redisRepository.saveZoneOverview(dto.getZoneId(), dto);
            } catch (Exception e) {
                log.error("[Redis Service] Zone Overview 캐싱 실패: zoneId={}, error={}",
                        dto.getZoneId(), e.getMessage());
            }
        }

        log.info("[Redis Service] Zone Overviews DB 조회 및 캐싱 완료: count={}", fromDb.size());
        return fromDb;
    }

    /**
     * 구역별 작업자 조회 (Cache-Aside 패턴)
     */
    @Override
    public List<ZoneWorkerDto> getWorkersByZone(Long zoneId) {
        log.debug("[Redis Service] Zone Workers 조회 시작: zoneId={}", zoneId);

        // 1. Redis 조회 시도
        List<ZoneWorkerDto> cached = redisRepository.getWorkersByZone(zoneId);

        if (cached != null && !cached.isEmpty()) {
            log.info("[Redis Service] Zone Workers 캐시 히트: zoneId={}, count={}", zoneId, cached.size());
            return cached;
        }

        // 2. Cache Miss → DB 조회
        log.info("[Redis Service] Zone Workers 캐시 미스 → DB 조회: zoneId={}", zoneId);
        List<ZoneWorkerDto> fromDb = controlMapper.selectWorkersByZoneId(zoneId);

        // 3. 이름 포맷팅 및 Redis 캐싱
        for (ZoneWorkerDto worker : fromDb) {
            worker.setName(WorkerNameFormatter.format(worker.getName(), worker.getPhoneNumber()));

            try {
                redisRepository.saveWorkerStatus(worker.getWorkerId(), worker);
            } catch (Exception e) {
                log.error("[Redis Service] Worker Status 캐싱 실패: workerId={}, error={}",
                        worker.getWorkerId(), e.getMessage());
            }
        }

        log.info("[Redis Service] Zone Workers DB 조회 및 캐싱 완료: zoneId={}, count={}",
                zoneId, fromDb.size());
        return fromDb;
    }

    /**
     * 대시보드 요약 조회 (Cache-Aside 패턴)
     */
    @Override
    public DashboardSummaryDto getDashboardSummary() {
        log.debug("[Redis Service] Dashboard Summary 조회 시작");

        // 1. Redis 조회 시도
        DashboardSummaryDto cached = redisRepository.getDashboardSummary();

        if (cached != null) {
            log.info("[Redis Service] Dashboard Summary 캐시 히트");
            return cached;
        }

        // 2. Cache Miss → DB 조회
        log.info("[Redis Service] Dashboard Summary 캐시 미스 → DB 조회");

        // 시스템 전체 지표 조회
        Integer totalActiveWorkers = controlMapper.countTotalActiveWorkers();
        Integer pendingIssues = controlMapper.countPendingIssues();
        Integer completedIssues = controlMapper.countTodayCompletedIssues();

        // 구역별 요약 정보 (기존 메서드 재사용)
        List<ZoneOverviewDto> zoneSummaries = getZoneOverviews();

        // 3. DTO 구성
        DashboardSummaryDto dto = DashboardSummaryDto.builder()
                .totalActiveWorkers(totalActiveWorkers != null ? totalActiveWorkers : 0)
                .pendingIssues(pendingIssues != null ? pendingIssues : 0)
                .completedIssues(completedIssues != null ? completedIssues : 0)
                .totalProgressRate(0.0) // 현재는 0.0으로 하드코딩
                .zoneSummaries(zoneSummaries)
                .build();

        // 4. Redis에 캐싱
        try {
            redisRepository.saveDashboardSummary(dto);
        } catch (Exception e) {
            log.error("[Redis Service] Dashboard Summary 캐싱 실패: error={}", e.getMessage());
        }

        log.info("[Redis Service] Dashboard Summary DB 조회 및 캐싱 완료");
        return dto;
    }

    /**
     * 작업자 호버 정보 조회
     * - 호버 정보는 실시간성이 매우 중요하므로 캐싱하지 않음
     * - 항상 DB에서 최신 데이터 조회
     */
    @Override
    public WorkerHoverDto getWorkerHoverInfo(Long workerId) {
        log.debug("[Redis Service] Worker Hover Info 조회: workerId={} (캐싱 안 함)", workerId);

        WorkerHoverDto dto = controlMapper.selectWorkerHoverInfo(workerId);

        if (dto == null) {
            throw new RuntimeException("해당 작업자가 존재하지 않거나 현재 활동 중이 아닙니다.");
        }

        // 이름 포맷팅
        dto.setName(WorkerNameFormatter.format(dto.getName(), dto.getPhoneNumber()));

        // Zone 매핑
        if (dto.getZoneId() != null) {
            dto.setCurrentZoneName(ZoneType.getNameById(dto.getZoneId()));
        }

        return dto;
    }

    /**
     * 관리자 강제 구역 배정
     * - DB 업데이트 후 관련 Redis 캐시 무효화
     */
    @Override
    @Transactional
    public void assignWorkerToZone(AdminZoneAssignmentRequest request) {
        Long workerId = request.getWorkerId();
        Long zoneId = request.getZoneId();

        log.info("[Redis Service] 구역 배정 시작: workerId={}, zoneId={}", workerId, zoneId);

        // 1. Validation
        if (!controlMapper.existsWorker(workerId)) {
            throw new RuntimeException("존재하지 않는 작업자입니다.");
        }
        if (!controlMapper.existsZone(zoneId)) {
            throw new RuntimeException("존재하지 않는 구역입니다.");
        }

        // 2. DB 업데이트
        controlMapper.closeActiveAssignment(workerId);
        controlMapper.insertAssignmentHistory(workerId, zoneId, request.getReason());
        controlMapper.updateUserAssignedZone(workerId, zoneId);

        // 3. Redis 캐시 무효화 (중요!)
        try {
            // 작업자 캐시 삭제
            redisRepository.deleteWorkerCache(workerId);

            // 구역 캐시 삭제 (이전 구역 + 새 구역)
            redisRepository.deleteZoneCache(zoneId);

            // 대시보드 캐시 삭제
            redisRepository.deleteDashboardCache();

            log.info("[Redis Service] 구역 배정 완료 및 캐시 무효화: workerId={}, zoneId={}",
                    workerId, zoneId);
        } catch (Exception e) {
            log.error("[Redis Service] 캐시 무효화 실패 (DB는 정상 업데이트됨): workerId={}, error={}",
                    workerId, e.getMessage());
        }
    }

    /**
     * 관리자 목록 조회
     * - 관리자 정보는 자주 변경되지 않으나, 실시간 상태 주입이 필요하므로 캐싱하지 않음
     */
    @Override
    public List<AdminResponseDto> getAdmins(Long zoneId, String name) {
        log.debug("[Redis Service] 관리자 목록 조회: zoneId={}, name={} (캐싱 안 함)", zoneId, name);

        // 1. DB 조회
        List<AdminQueryVo> adminVos = controlMapper.selectAdmins(zoneId, name);

        // 2. UserVO 생성 (실시간 상태 주입용)
        List<UserVO> userVOs = adminVos.stream()
                .map(vo -> {
                    UserVO userVO = new UserVO();
                    userVO.setUserId(vo.getAdminId());
                    return userVO;
                })
                .toList();

        // 3. 실시간 Redis 상태 주입
        userService.populateUserStatus(userVOs);

        // 4. VO → DTO 매핑
        return java.util.stream.IntStream.range(0, adminVos.size())
                .mapToObj(i -> {
                    AdminQueryVo vo = adminVos.get(i);
                    UserVO userVO = userVOs.get(i);

                    return AdminResponseDto.builder()
                            .adminId(vo.getAdminId())
                            .name(vo.getRawName())
                            .assignedZoneId(vo.getAssignedZoneId())
                            .zoneName(ZoneType.getNameById(vo.getAssignedZoneId()))
                            .currentStatus(userVO.getStatus()) // 실시간 Redis 상태
                            .build();
                })
                .toList();
    }
}
