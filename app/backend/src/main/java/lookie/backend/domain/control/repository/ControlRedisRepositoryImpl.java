package lookie.backend.domain.control.repository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.control.dto.DashboardSummaryDto;
import lookie.backend.domain.control.dto.ZoneOverviewDto;
import lookie.backend.domain.control.dto.ZoneWorkerDto;
import lookie.backend.domain.control.dto.map.ZoneWorkerLocationDto;
import lookie.backend.global.constant.RedisKeyConstants;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Control 도메인 Redis Repository 구현체
 * - RedisTemplate을 사용하여 Hash, Sorted Set 자료구조 활용
 * - TTL 설정으로 메모리 효율 및 데이터 일관성 보장
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class ControlRedisRepositoryImpl implements ControlRedisRepository {

    @Qualifier("controlRedisTemplate")
    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * 시스템 고정 구역 ID 목록 (1~4번 구역)
     * - DB 조회 없이 고정값 사용으로 성능 향상 및 NPE 방지
     */
    private static final List<Long> ACTIVE_ZONE_IDS = List.of(1L, 2L, 3L, 4L);

    // ==================== Zone 관련 ====================

    @Override
    public void saveZoneOverview(Long zoneId, ZoneOverviewDto dto) {
        String key = String.format(RedisKeyConstants.ZONE_OVERVIEW, zoneId);

        try {
            // Hash 구조로 저장 (필드별 개별 업데이트 가능)
            Map<String, Object> hash = new HashMap<>();
            hash.put("zoneId", dto.getZoneId());
            hash.put("zoneName", dto.getZoneName());
            hash.put("workerCount", dto.getWorkerCount());
            hash.put("progressRate", dto.getProgressRate());
            hash.put("status", dto.getStatus());

            redisTemplate.opsForHash().putAll(key, hash);

            // TTL 설정
            redisTemplate.expire(key, RedisKeyConstants.ZONE_OVERVIEW_TTL, TimeUnit.SECONDS);

            log.debug("[Redis] Zone Overview 저장 완료: zoneId={}, key={}", zoneId, key);
        } catch (Exception e) {
            log.error("[Redis] Zone Overview 저장 실패: zoneId={}, error={}", zoneId, e.getMessage());
        }
    }

    @Override
    public ZoneOverviewDto getZoneOverview(Long zoneId) {
        String key = String.format(RedisKeyConstants.ZONE_OVERVIEW, zoneId);

        try {
            Map<Object, Object> hash = redisTemplate.opsForHash().entries(key);

            if (hash.isEmpty()) {
                log.debug("[Redis] Zone Overview 캐시 미스: zoneId={}", zoneId);
                return null;
            }

            return ZoneOverviewDto.builder()
                    .zoneId(convertToLong(hash.get("zoneId")))
                    .zoneName((String) hash.get("zoneName"))
                    .workerCount(convertToInteger(hash.get("workerCount")))
                    .progressRate(convertToDouble(hash.get("progressRate")))
                    .status((String) hash.get("status"))
                    .build();
        } catch (Exception e) {
            log.error("[Redis] Zone Overview 조회 실패: zoneId={}, error={}", zoneId, e.getMessage());
            return null;
        }
    }

    @Override
    public List<ZoneOverviewDto> getAllZoneOverviews() {
        List<ZoneOverviewDto> results = new ArrayList<>();

        try {
            // 고정된 구역 ID 목록 순회 (1~4번 구역)
            for (Long zoneId : ACTIVE_ZONE_IDS) {
                ZoneOverviewDto dto = getZoneOverview(zoneId);
                if (dto != null) {
                    results.add(dto);
                }
            }

            log.debug("[Redis] 전체 Zone Overview 조회 완료: count={}", results.size());
        } catch (Exception e) {
            log.error("[Redis] 전체 Zone Overview 조회 실패: error={}", e.getMessage());
        }

        return results;
    }

    @Override
    public void deleteZoneCache(Long zoneId) {
        String overviewKey = String.format(RedisKeyConstants.ZONE_OVERVIEW, zoneId);
        String workersKey = String.format(RedisKeyConstants.ZONE_WORKERS, zoneId);
        String bottleneckKey = String.format(RedisKeyConstants.ZONE_BOTTLENECK, zoneId);

        try {
            redisTemplate.delete(Arrays.asList(overviewKey, workersKey, bottleneckKey));
            log.debug("[Redis] Zone 캐시 삭제 완료: zoneId={}", zoneId);
        } catch (Exception e) {
            log.error("[Redis] Zone 캐시 삭제 실패: zoneId={}, error={}", zoneId, e.getMessage());
        }
    }

    // ==================== Worker 관련 ====================

    @Override
    public void saveWorkerStatus(Long workerId, ZoneWorkerDto dto) {
        String key = String.format(RedisKeyConstants.WORKER_STATUS, workerId);

        try {
            Map<String, Object> hash = new HashMap<>();
            hash.put("workerId", dto.getWorkerId());
            hash.put("name", dto.getName());
            hash.put("workCount", dto.getWorkCount());
            hash.put("processingSpeed", dto.getProcessingSpeed());
            hash.put("currentTaskProgress", dto.getCurrentTaskProgress());
            hash.put("status", dto.getStatus());
            hash.put("webrtcStatus", dto.getWebrtcStatus());

            redisTemplate.opsForHash().putAll(key, hash);
            redisTemplate.expire(key, RedisKeyConstants.WORKER_STATUS_TTL, TimeUnit.SECONDS);

            log.debug("[Redis] Worker Status 저장 완료: workerId={}", workerId);
        } catch (Exception e) {
            log.error("[Redis] Worker Status 저장 실패: workerId={}, error={}", workerId, e.getMessage());
        }
    }

    @Override
    public ZoneWorkerDto getWorkerStatus(Long workerId) {
        String key = String.format(RedisKeyConstants.WORKER_STATUS, workerId);

        try {
            Map<Object, Object> hash = redisTemplate.opsForHash().entries(key);

            if (hash.isEmpty()) {
                log.debug("[Redis] Worker Status 캐시 미스: workerId={}", workerId);
                return null;
            }

            return ZoneWorkerDto.builder()
                    .workerId(convertToLong(hash.get("workerId")))
                    .name((String) hash.get("name"))
                    .workCount(convertToInteger(hash.get("workCount")))
                    .processingSpeed(convertToDouble(hash.get("processingSpeed")))
                    .currentTaskProgress(convertToDouble(hash.get("currentTaskProgress")))
                    .status((String) hash.get("status"))
                    .webrtcStatus((String) hash.get("webrtcStatus"))
                    .build();
        } catch (Exception e) {
            log.error("[Redis] Worker Status 조회 실패: workerId={}, error={}", workerId, e.getMessage());
            return null;
        }
    }

    @Override
    public List<ZoneWorkerDto> getWorkersByZone(Long zoneId) {
        // Zone의 Worker ID Set 조회
        String workersKey = String.format(RedisKeyConstants.ZONE_WORKERS, zoneId);

        try {
            Set<Object> workerIds = redisTemplate.opsForSet().members(workersKey);

            if (workerIds == null || workerIds.isEmpty()) {
                log.debug("[Redis] Zone Workers 캐시 미스: zoneId={}", zoneId);
                return new ArrayList<>();
            }

            // 각 Worker의 상태 조회
            List<ZoneWorkerDto> results = new ArrayList<>();
            for (Object workerIdObj : workerIds) {
                Long workerId = Long.parseLong(workerIdObj.toString());
                ZoneWorkerDto dto = getWorkerStatus(workerId);
                if (dto != null) {
                    results.add(dto);
                }
            }

            log.debug("[Redis] Zone Workers 조회 완료: zoneId={}, count={}", zoneId, results.size());
            return results;
        } catch (Exception e) {
            log.error("[Redis] Zone Workers 조회 실패: zoneId={}, error={}", zoneId, e.getMessage());
            return new ArrayList<>();
        }
    }

    @Override
    public void saveWorkerLocation(Long workerId, ZoneWorkerLocationDto dto) {
        String key = String.format(RedisKeyConstants.WORKER_LOCATION, workerId);

        try {
            Map<String, Object> hash = new HashMap<>();
            hash.put("workerId", dto.getWorkerId());
            hash.put("name", dto.getName());
            hash.put("currentLocationCode", dto.getCurrentLocationCode());
            hash.put("isBottleneck", dto.getIsBottleneck());
            hash.put("lastUpdated", System.currentTimeMillis());

            redisTemplate.opsForHash().putAll(key, hash);
            redisTemplate.expire(key, RedisKeyConstants.WORKER_LOCATION_TTL, TimeUnit.SECONDS);

            log.debug("[Redis] Worker Location 저장 완료: workerId={}", workerId);
        } catch (Exception e) {
            log.error("[Redis] Worker Location 저장 실패: workerId={}, error={}", workerId, e.getMessage());
        }
    }

    @Override
    public ZoneWorkerLocationDto getWorkerLocation(Long workerId) {
        String key = String.format(RedisKeyConstants.WORKER_LOCATION, workerId);

        try {
            Map<Object, Object> hash = redisTemplate.opsForHash().entries(key);

            if (hash.isEmpty()) {
                log.debug("[Redis] Worker Location 캐시 미스: workerId={}", workerId);
                return null;
            }

            return ZoneWorkerLocationDto.builder()
                    .workerId(convertToLong(hash.get("workerId")))
                    .name((String) hash.get("name"))
                    .currentLocationCode((String) hash.get("currentLocationCode"))
                    .isBottleneck(convertToBoolean(hash.get("isBottleneck")))
                    .build();
        } catch (Exception e) {
            log.error("[Redis] Worker Location 조회 실패: workerId={}, error={}", workerId, e.getMessage());
            return null;
        }
    }

    @Override
    public List<ZoneWorkerLocationDto> getWorkerLocationsByZone(Long zoneId) {
        // Zone의 Worker ID Set 조회
        String workersKey = String.format(RedisKeyConstants.ZONE_WORKERS, zoneId);

        try {
            Set<Object> workerIds = redisTemplate.opsForSet().members(workersKey);

            if (workerIds == null || workerIds.isEmpty()) {
                log.debug("[Redis] Zone Worker Locations 캐시 미스: zoneId={}", zoneId);
                return new ArrayList<>();
            }

            // 각 Worker의 위치 조회
            List<ZoneWorkerLocationDto> results = new ArrayList<>();
            for (Object workerIdObj : workerIds) {
                Long workerId = Long.parseLong(workerIdObj.toString());
                ZoneWorkerLocationDto dto = getWorkerLocation(workerId);
                if (dto != null) {
                    results.add(dto);
                }
            }

            log.debug("[Redis] Zone Worker Locations 조회 완료: zoneId={}, count={}", zoneId, results.size());
            return results;
        } catch (Exception e) {
            log.error("[Redis] Zone Worker Locations 조회 실패: zoneId={}, error={}", zoneId, e.getMessage());
            return new ArrayList<>();
        }
    }

    @Override
    public void deleteWorkerCache(Long workerId) {
        String statusKey = String.format(RedisKeyConstants.WORKER_STATUS, workerId);
        String locationKey = String.format(RedisKeyConstants.WORKER_LOCATION, workerId);

        try {
            redisTemplate.delete(Arrays.asList(statusKey, locationKey));
            log.debug("[Redis] Worker 캐시 삭제 완료: workerId={}", workerId);
        } catch (Exception e) {
            log.error("[Redis] Worker 캐시 삭제 실패: workerId={}, error={}", workerId, e.getMessage());
        }
    }

    // ==================== Bottleneck 관리 (Sorted Set) ====================

    @Override
    public void addBottleneckWorker(Long zoneId, Long workerId, long elapsedSeconds) {
        String key = String.format(RedisKeyConstants.ZONE_BOTTLENECK, zoneId);

        try {
            // Sorted Set에 추가 (Score = 경과 시간)
            redisTemplate.opsForZSet().add(key, workerId.toString(), elapsedSeconds);
            redisTemplate.expire(key, RedisKeyConstants.BOTTLENECK_TTL, TimeUnit.SECONDS);

            log.debug("[Redis] Bottleneck Worker 추가: zoneId={}, workerId={}, elapsed={}s",
                    zoneId, workerId, elapsedSeconds);
        } catch (Exception e) {
            log.error("[Redis] Bottleneck Worker 추가 실패: zoneId={}, workerId={}, error={}",
                    zoneId, workerId, e.getMessage());
        }
    }

    @Override
    public void removeBottleneckWorker(Long zoneId, Long workerId) {
        String key = String.format(RedisKeyConstants.ZONE_BOTTLENECK, zoneId);

        try {
            redisTemplate.opsForZSet().remove(key, workerId.toString());
            log.debug("[Redis] Bottleneck Worker 제거: zoneId={}, workerId={}", zoneId, workerId);
        } catch (Exception e) {
            log.error("[Redis] Bottleneck Worker 제거 실패: zoneId={}, workerId={}, error={}",
                    zoneId, workerId, e.getMessage());
        }
    }

    @Override
    public List<Long> getBottleneckWorkers(Long zoneId, int thresholdSeconds) {
        String key = String.format(RedisKeyConstants.ZONE_BOTTLENECK, zoneId);

        try {
            // Score가 threshold 이상인 멤버 조회
            Set<Object> members = redisTemplate.opsForZSet()
                    .rangeByScore(key, thresholdSeconds, Double.MAX_VALUE);

            if (members == null || members.isEmpty()) {
                log.debug("[Redis] Bottleneck Workers 없음: zoneId={}, threshold={}s", zoneId, thresholdSeconds);
                return new ArrayList<>();
            }

            List<Long> workerIds = members.stream()
                    .map(m -> Long.parseLong(m.toString()))
                    .collect(Collectors.toList());

            log.debug("[Redis] Bottleneck Workers 조회 완료: zoneId={}, count={}", zoneId, workerIds.size());
            return workerIds;
        } catch (Exception e) {
            log.error("[Redis] Bottleneck Workers 조회 실패: zoneId={}, error={}", zoneId, e.getMessage());
            return new ArrayList<>();
        }
    }

    @Override
    public void deleteBottleneckCache(Long zoneId) {
        String key = String.format(RedisKeyConstants.ZONE_BOTTLENECK, zoneId);

        try {
            redisTemplate.delete(key);
            log.debug("[Redis] Bottleneck 캐시 삭제 완료: zoneId={}", zoneId);
        } catch (Exception e) {
            log.error("[Redis] Bottleneck 캐시 삭제 실패: zoneId={}, error={}", zoneId, e.getMessage());
        }
    }

    // ==================== Dashboard 관련 ====================

    @Override
    public void saveDashboardSummary(DashboardSummaryDto dto) {
        String key = RedisKeyConstants.DASHBOARD_SUMMARY;

        try {
            Map<String, Object> hash = new HashMap<>();
            hash.put("totalActiveWorkers", dto.getTotalActiveWorkers());
            hash.put("pendingIssues", dto.getPendingIssues());
            hash.put("completedIssues", dto.getCompletedIssues());
            hash.put("totalProgressRate", dto.getTotalProgressRate());

            redisTemplate.opsForHash().putAll(key, hash);
            redisTemplate.expire(key, RedisKeyConstants.DASHBOARD_TTL, TimeUnit.SECONDS);

            log.debug("[Redis] Dashboard Summary 저장 완료");
        } catch (Exception e) {
            log.error("[Redis] Dashboard Summary 저장 실패: error={}", e.getMessage());
        }
    }

    @Override
    public DashboardSummaryDto getDashboardSummary() {
        String key = RedisKeyConstants.DASHBOARD_SUMMARY;

        try {
            Map<Object, Object> hash = redisTemplate.opsForHash().entries(key);

            if (hash.isEmpty()) {
                log.debug("[Redis] Dashboard Summary 캐시 미스");
                return null;
            }

            // Zone Summaries는 별도 조회
            List<ZoneOverviewDto> zoneSummaries = getAllZoneOverviews();

            return DashboardSummaryDto.builder()
                    .totalActiveWorkers(convertToInteger(hash.get("totalActiveWorkers")))
                    .pendingIssues(convertToInteger(hash.get("pendingIssues")))
                    .completedIssues(convertToInteger(hash.get("completedIssues")))
                    .totalProgressRate(convertToDouble(hash.get("totalProgressRate")))
                    .zoneSummaries(zoneSummaries)
                    .build();
        } catch (Exception e) {
            log.error("[Redis] Dashboard Summary 조회 실패: error={}", e.getMessage());
            return null;
        }
    }

    @Override
    public void deleteDashboardCache() {
        String key = RedisKeyConstants.DASHBOARD_SUMMARY;

        try {
            redisTemplate.delete(key);
            log.debug("[Redis] Dashboard 캐시 삭제 완료");
        } catch (Exception e) {
            log.error("[Redis] Dashboard 캐시 삭제 실패: error={}", e.getMessage());
        }
    }

    // ==================== Utility ====================

    @Override
    public void deleteAllControlCache() {
        try {
            // SCAN을 사용한 안전한 캐시 삭제 (keys() 대신 사용)
            String pattern = RedisKeyConstants.CONTROL_PREFIX + "*";
            ScanOptions scanOptions = ScanOptions.scanOptions()
                    .match(pattern)
                    .count(100)
                    .build();

            Set<String> keysToDelete = new HashSet<>();

            // SCAN으로 키 수집
            redisTemplate.execute((org.springframework.data.redis.core.RedisCallback<Object>) connection -> {
                try (Cursor<byte[]> cursor = connection.scan(scanOptions)) {
                    cursor.forEachRemaining(key -> {
                        keysToDelete.add(new String(key));
                    });
                }
                return null;
            });

            // 수집된 키 일괄 삭제
            if (!keysToDelete.isEmpty()) {
                redisTemplate.delete(keysToDelete);
                log.info("[Redis] Control 도메인 전체 캐시 삭제 완료: count={}", keysToDelete.size());
            } else {
                log.debug("[Redis] 삭제할 Control 캐시 없음");
            }
        } catch (Exception e) {
            log.error("[Redis] Control 도메인 전체 캐시 삭제 실패: error={}", e.getMessage());
        }
    }

    // ==================== Type Conversion Helpers ====================

    /**
     * Object를 Long으로 안전하게 변환
     */
    private Long convertToLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        return Long.parseLong(value.toString());
    }

    /**
     * Object를 Integer로 안전하게 변환
     */
    private Integer convertToInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return Integer.parseInt(value.toString());
    }

    /**
     * Object를 Double로 안전하게 변환
     */
    private Double convertToDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return Double.parseDouble(value.toString());
    }

    /**
     * Object를 Boolean으로 안전하게 변환
     */
    private Boolean convertToBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        return Boolean.parseBoolean(value.toString());
    }
}
