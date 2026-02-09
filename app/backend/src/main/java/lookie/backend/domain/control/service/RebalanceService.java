package lookie.backend.domain.control.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.batch.mapper.BatchMapper;
import lookie.backend.domain.batch.vo.BatchVO;
import lookie.backend.domain.control.dto.DashboardSummaryDto;
import lookie.backend.domain.control.dto.RebalanceApplyRequest;
import lookie.backend.domain.control.dto.ZoneOverviewDto;
import lookie.backend.domain.control.mapper.ControlMapper;
import lookie.backend.domain.control.mapper.RebalanceMapper;
import lookie.backend.domain.control.repository.ControlRedisRepository;
import lookie.backend.domain.control.vo.RebalanceSnapshotVO;
import lookie.backend.global.common.type.ZoneType;
import lookie.backend.infra.ai.AiRebalanceClient;
import lookie.backend.infra.ai.dto.RebalanceRecommendResponse;
import lookie.backend.domain.task.mapper.TaskItemMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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
        return aiRebalanceClient.requestRecommend(snapshots);
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

        // 3.5) 최신 스냅샷을 기준으로, 현재 배정 zone 반영한 스냅샷 생성
        try {
            BatchVO currentBatch = batchMapper.findCurrentInProgress();
            if (currentBatch != null) {
                rebalanceMapper.insertSnapshotFromLatestWithUserZone(currentBatch.getBatchId());
            }
        } catch (Exception e) {
            log.warn("[RebalanceService] Snapshot refresh failed after apply: {}", e.getMessage());
        }

        // 4. Redis cache invalidation (zone/dashboard/worker)
        try {
            redisRepository.deleteAllControlCache();

            // Warm cache immediately so UI reflects changes without delay
            List<ZoneOverviewDto> overviews = controlMapper.selectZoneOverviews();
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
        return controlMapper.selectZoneOverviews();
    }
}
