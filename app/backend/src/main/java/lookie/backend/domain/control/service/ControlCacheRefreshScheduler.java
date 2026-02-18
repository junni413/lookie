package lookie.backend.domain.control.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.batch.mapper.BatchMapper;
import lookie.backend.domain.batch.vo.BatchVO;
import lookie.backend.domain.control.dto.DashboardSummaryDto;
import lookie.backend.domain.control.dto.ZoneOverviewDto;
import lookie.backend.domain.control.mapper.ControlMapper;
import lookie.backend.domain.control.repository.ControlRedisRepository;
import lookie.backend.domain.task.mapper.TaskItemMapper;
import lookie.backend.global.common.type.ZoneType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ControlCacheRefreshScheduler {

    private final ControlMapper controlMapper;
    private final ControlRedisRepository redisRepository;
    private final BatchMapper batchMapper;
    private final TaskItemMapper taskItemMapper;

    /**
     * Periodically refresh control cache to avoid stale dashboards.
     * Interval is configurable via control.cache.refresh-interval-ms (default: 60000ms).
     */
    @Scheduled(fixedDelayString = "${control.cache.refresh-interval-ms:60000}")
    public void refreshControlCaches() {
        try {
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
            log.error("[ControlCacheRefreshScheduler] Failed to refresh control caches", e);
        }
    }
}
