package lookie.backend.infra.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.control.vo.RebalanceSnapshotVO;
import lookie.backend.infra.ai.dto.RebalanceRecommendRequest;
import lookie.backend.infra.ai.dto.RebalanceRecommendResponse;
import lookie.backend.infra.ai.dto.SnapshotRow;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

// removed unused import
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiRebalanceClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.server.url}")
    private String aiServerUrl;

    /**
     * AI 서버에 재배치 추천 요청
     * 
     * @param snapshots 현재 배치의 최신 스냅샷 리스트
     * @return AI 추천 결과 (moves 등)
     */
    public RebalanceRecommendResponse requestRecommend(List<RebalanceSnapshotVO> snapshots) {
        String url = aiServerUrl + "/rebalance/recommend";

        // 1. VO -> DTO 변환 (Snake Case Mapping을 위해)
        List<SnapshotRow> rows = snapshots.stream()
                .map(this::convertToRow)
                .collect(Collectors.toList());

        RebalanceRecommendRequest request = RebalanceRecommendRequest.builder()
                .rows(rows)
                .build();

        log.info("[AiRebalanceClient] Requesting recommend from AI Server. url={}, rowCount={}", url, rows.size());

        try {
            // 2. POST 요청
            RebalanceRecommendResponse response = restTemplate.postForObject(url, request,
                    RebalanceRecommendResponse.class);
            log.info("[AiRebalanceClient] Received response. moves={}",
                    (response != null && response.getMoves() != null) ? response.getMoves().size() : 0);
            return response;
        } catch (Exception e) {
            log.error("[AiRebalanceClient] Failed to request recommend. error={}", e.getMessage(), e);
            throw new RuntimeException("AI 서버 호출 중 오류가 발생했습니다.", e);
        }
    }

    private SnapshotRow convertToRow(RebalanceSnapshotVO vo) {
        return SnapshotRow.builder()
                .ts(vo.getTs().format(DateTimeFormatter.ISO_DATE_TIME)) // ISO 8601
                .batchId(vo.getBatchId())
                .workerId(vo.getWorkerId())
                .zoneId(vo.getZoneId())
                .progress(vo.getProgress())
                .remainingQty(vo.getRemainingQty())
                .timeToPlannedEndMin(vo.getTimeToPlannedEndMin())
                .timeToDeadlineMin(vo.getTimeToDeadlineMin())
                .zoneBacklog(vo.getZoneBacklog())
                .zoneActiveWorkers(vo.getZoneActiveWorkers())
                .zoneLocationCnt(vo.getZoneLocationCnt())
                .zoneBlockingIssueCnt(vo.getZoneBlockingIssueCnt())
                .workerSpeed30mAvg(vo.getWorkerSpeed30mAvg())
                .speedLabel(vo.getSpeedLabel())
                .pickedTotal(vo.getPickedTotal())
                .requiredTotal(vo.getRequiredTotal())
                .build();
    }
}
