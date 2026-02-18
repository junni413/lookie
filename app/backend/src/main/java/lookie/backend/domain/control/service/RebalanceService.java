package lookie.backend.domain.control.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.batch.mapper.BatchMapper;
import lookie.backend.domain.batch.vo.BatchVO;
import lookie.backend.domain.control.dto.DashboardSummaryDto;
import lookie.backend.domain.control.dto.RebalanceApplyRequest;
import lookie.backend.domain.control.dto.ZoneOverviewDto;
import lookie.backend.domain.control.dto.ZoneMoveRequest;
import lookie.backend.domain.control.mapper.ControlMapper;
import lookie.backend.domain.control.mapper.RebalanceMapper;
import lookie.backend.domain.control.repository.ControlRedisRepository;
import lookie.backend.domain.control.vo.RebalanceSnapshotVO;
import lookie.backend.global.common.type.ZoneType;
import lookie.backend.infra.ai.AiRebalanceClient;
import lookie.backend.infra.ai.dto.Move;
import lookie.backend.infra.ai.dto.RebalanceRecommendResponse;
import lookie.backend.domain.task.mapper.TaskItemMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.redis.core.StringRedisTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RebalanceService {

    private final BatchMapper batchMapper;
    private final RebalanceMapper rebalanceMapper;
    private final ControlMapper controlMapper;
    private final AiRebalanceClient aiRebalanceClient;
    private final ControlRedisRepository redisRepository;
    private final TaskItemMapper taskItemMapper;
    private final WorkerMonitoringService workerMonitoringService;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    private static final String AI_ZONE_RISK_KEY = "lookie:control:ai:zone_risk";

    /**
     * AI 재배치 추천 조회
     * 1. 현재 진행 중인 배치 조회
     * 2. 해당 배치의 최신 스냅샷 조회
     * 3. AI 서버에 추천 요청
     */
    @Transactional(readOnly = true)
    public RebalanceRecommendResponse recommend() {
        // 1. Loading Current Batch
        BatchVO currentBatch = batchMapper.findCurrentInProgress();
        if (currentBatch == null) {
            log.warn("[RebalanceService] No active batch found. Cannot recommend rebalance.");
            // 배치가 없으면 빈 응답 또는 에러 처리 (여기서는 빈 응답 반환)
            return new RebalanceRecommendResponse();
        }

        // 2. Loading Latest Snapshots
        List<RebalanceSnapshotVO> snapshots = rebalanceMapper.selectLatestSnapshots(currentBatch.getBatchId());
        if (snapshots.isEmpty()) {
            log.warn("[RebalanceService] No snapshots found for batchId={}", currentBatch.getBatchId());
            return new RebalanceRecommendResponse();
        }

        // 3. Request to AI Server
        RebalanceRecommendResponse response = aiRebalanceClient.requestRecommend(snapshots);
        response = buildFallbackMovesIfNeeded(response, snapshots);

        // 4. Clear control cache and AI risk map so pre-apply status stays DB-based
        try {
            redisRepository.deleteAllControlCache();
            stringRedisTemplate.delete(AI_ZONE_RISK_KEY);
        } catch (Exception e) {
            log.warn("[RebalanceService] Failed to clear AI zone risks: {}", e.getMessage());
        }

        return response;
    }

    private RebalanceRecommendResponse buildFallbackMovesIfNeeded(
            RebalanceRecommendResponse response,
            List<RebalanceSnapshotVO> snapshots
    ) {
        if (response == null) {
            response = new RebalanceRecommendResponse();
        }
        if (response.getMoves() != null && !response.getMoves().isEmpty()) {
            return response;
        }
        if (snapshots == null || snapshots.isEmpty()) {
            return response;
        }

        List<ZoneOverviewDto> zones = controlMapper.selectZoneOverviews();
        List<ZoneOverviewDto> criticalZones = zones.stream()
                .filter(z -> "CRITICAL".equalsIgnoreCase(z.getStatus()))
                .collect(Collectors.toList());
        if (criticalZones.isEmpty()) {
            return response;
        }

        List<ZoneOverviewDto> donorZones = zones.stream()
                .filter(z -> !"CRITICAL".equalsIgnoreCase(z.getStatus()))
                .sorted(Comparator.comparingDouble(this::zoneSlackMinutes).reversed())
                .collect(Collectors.toList());
        if (donorZones.isEmpty()) {
            return response;
        }

        Map<Long, List<RebalanceSnapshotVO>> workersByZone = snapshots.stream()
                .collect(Collectors.groupingBy(RebalanceSnapshotVO::getZoneId));
        for (List<RebalanceSnapshotVO> workers : workersByZone.values()) {
            workers.sort(
                    Comparator.comparing((RebalanceSnapshotVO s) -> s.getRemainingQty() == null ? Integer.MAX_VALUE : s.getRemainingQty())
                            .thenComparing(s -> s.getProgress() == null ? 0.0 : s.getProgress().doubleValue(), Comparator.reverseOrder())
            );
        }

        Map<Long, Integer> donorUsed = new HashMap<>();
        Set<Long> usedWorkers = new HashSet<>();
        List<Move> fallbackMoves = new ArrayList<>();

        for (ZoneOverviewDto critical : criticalZones) {
            Long targetZoneId = critical.getZoneId();
            if (targetZoneId == null) {
                continue;
            }

            Move selected = null;
            for (ZoneOverviewDto donor : donorZones) {
                Long donorZoneId = donor.getZoneId();
                if (donorZoneId == null || donorZoneId.equals(targetZoneId)) {
                    continue;
                }

                List<RebalanceSnapshotVO> candidates = workersByZone.getOrDefault(donorZoneId, List.of());
                int totalWorkers = candidates.size();
                int alreadyUsed = donorUsed.getOrDefault(donorZoneId, 0);
                if (totalWorkers - alreadyUsed <= 1) {
                    continue;
                }

                for (RebalanceSnapshotVO candidate : candidates) {
                    if (candidate.getWorkerId() == null || usedWorkers.contains(candidate.getWorkerId())) {
                        continue;
                    }
                    Move move = new Move();
                    move.setWorkerId(candidate.getWorkerId());
                    move.setFromZone(donorZoneId);
                    move.setToZone(targetZoneId);
                    move.setScore(1.0);
                    move.setReason("ETA 기반 fallback 재배치");
                    selected = move;
                    usedWorkers.add(candidate.getWorkerId());
                    donorUsed.put(donorZoneId, alreadyUsed + 1);
                    break;
                }

                if (selected != null) {
                    break;
                }
            }

            if (selected != null) {
                fallbackMoves.add(selected);
            }
        }

        if (!fallbackMoves.isEmpty()) {
            response.setMoves(fallbackMoves);
            log.info("[RebalanceService] Applied fallback recommend moves. count={}", fallbackMoves.size());
        }

        return response;
    }

    private double zoneSlackMinutes(ZoneOverviewDto zone) {
        if (zone == null || zone.getRemainingDeadlineMinutes() == null || zone.getEstimatedCompletionMinutes() == null) {
            return Double.NEGATIVE_INFINITY;
        }
        return zone.getRemainingDeadlineMinutes() - zone.getEstimatedCompletionMinutes();
    }

    private void cacheAiZoneRisks(RebalanceRecommendResponse response) throws Exception {
        if (response == null || response.getZoneRisks() == null || response.getZoneRisks().isEmpty()) {
            return;
        }

        Map<String, Double> riskMap = new HashMap<>();
        for (RebalanceRecommendResponse.ZoneRiskInfo info : response.getZoneRisks()) {
            if (info.getZoneId() == null) {
                continue;
            }
            Double risk = info.getRiskAfter() != null ? info.getRiskAfter() : info.getRiskBefore();
            if (risk == null) {
                continue;
            }
            riskMap.put(String.valueOf(info.getZoneId()), risk);
        }

        if (riskMap.isEmpty()) {
            return;
        }

        String json = objectMapper.writeValueAsString(riskMap);
        stringRedisTemplate.opsForValue().set(AI_ZONE_RISK_KEY, json, 10, TimeUnit.MINUTES);
    }

    /**
     * AI 재배치 적용 (Apply)
     * - 각 이동 요청에 대해 DB 상태 갱신 (TEMP / AI)
     * - 트랜잭션 필수 (전체 성공 or 전체 실패)
     */
    @Transactional
    public List<ZoneOverviewDto> apply(RebalanceApplyRequest request) {
        if (request.getMoves() == null || request.getMoves().isEmpty()) {
            return controlMapper.selectZoneOverviews();
        }

        String reason = (request.getReason() == null || request.getReason().isEmpty())
                ? "AI Rebalance Applied"
                : request.getReason();

        for (RebalanceApplyRequest.ApplyMove move : request.getMoves()) {
            Long workerId = move.getWorkerId();
            Long toZone = move.getToZone();

            // 1. 기존 배정 종료
            controlMapper.closeActiveAssignment(workerId);

            // 2. 사용자 배정 정보 업데이트 (System of Record: toZone으로 갱신)
            controlMapper.updateUserAssignedZone(workerId, toZone);

            // 3. 새 배정 이력 추가 (TEMP / AI)
            // 기존 insertAssignmentHistory는 BASE/ADMIN 하드코딩이므로 사용 불가
            controlMapper.insertAiAssignmentHistory(workerId, toZone, "TEMP", "AI", reason);
        }

        List<ZoneMoveRequest> zoneMoves = request.getMoves().stream()
                .map(m -> new ZoneMoveRequest(m.getWorkerId(), m.getToZone()))
                .collect(Collectors.toList());

        // 3.5) 최신 스냅샷을 기준으로, 현재 배정 zone 반영한 스냅샷 생성
        List<RebalanceSnapshotVO> snapshots = null;
        try {
            BatchVO currentBatch = batchMapper.findCurrentInProgress();
            if (currentBatch != null) {
                rebalanceMapper.insertSnapshotFromLatestWithUserZone(currentBatch.getBatchId());
                snapshots = rebalanceMapper.selectLatestSnapshots(currentBatch.getBatchId());
            }
        } catch (Exception e) {
            log.warn("[RebalanceService] Snapshot refresh failed after apply: {}", e.getMessage());
        }

        // 3.6) Recompute AI risks with applied moves for immediate status reflection
        RebalanceRecommendResponse postApplyRiskResponse = null;
        try {
            if (snapshots != null && !snapshots.isEmpty()) {
                postApplyRiskResponse = aiRebalanceClient.requestRecommendWithMoves(snapshots, zoneMoves);
            }
        } catch (Exception e) {
            log.warn("[RebalanceService] Failed to recompute AI risks after apply: {}", e.getMessage());
        }

        // 4. Redis cache invalidation (zone/dashboard/worker)
        try {
            redisRepository.deleteAllControlCache();

            // Cache AI risk AFTER cache clear so getZoneOverviews uses fresh AI status
            try {
                if (postApplyRiskResponse != null) {
                    cacheAiZoneRisks(postApplyRiskResponse);
                }
            } catch (Exception e) {
                log.warn("[RebalanceService] Failed to cache AI risks after apply: {}", e.getMessage());
            }

            // Warm cache immediately so UI reflects changes without delay
            List<ZoneOverviewDto> overviews = workerMonitoringService.getZoneOverviews();
            for (ZoneOverviewDto dto : overviews) {
                dto.setZoneName(ZoneType.getNameById(dto.getZoneId()));
                redisRepository.saveZoneOverview(dto.getZoneId(), dto);
            }

            double totalProgressRate = 0.0;
            BatchVO currentBatch = batchMapper.findCurrentInProgress();
            if (currentBatch != null) {
                int totalItems = taskItemMapper.countItemsByBatch(currentBatch.getBatchId());
                int completedItems = taskItemMapper.countCompletedItemsByBatch(currentBatch.getBatchId());
                totalProgressRate = totalItems > 0 ? (double) completedItems * 100 / totalItems : 0.0;
                totalProgressRate = Math.round(totalProgressRate * 10.0) / 10.0;
            }

            DashboardSummaryDto summary = DashboardSummaryDto.builder()
                    .totalActiveWorkers(controlMapper.countTotalActiveWorkers())
                    .pendingIssues(controlMapper.countPendingIssues())
                    .completedIssues(controlMapper.countTodayCompletedIssues())
                    .totalProgressRate(totalProgressRate)
                    .zoneSummaries(overviews)
                    .build();
            redisRepository.saveDashboardSummary(summary);
        } catch (Exception e) {
            log.error("[RebalanceService] Cache invalidation failed after apply: {}", e.getMessage());
        }

        log.info("[RebalanceService] Applied {} moves. Reason={}", request.getMoves().size(), reason);
        return workerMonitoringService.getZoneOverviews();
    }
}
