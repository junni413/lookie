package lookie.backend.global.constant;

/**
 * Redis 키 패턴 상수 정의
 * - Magic String 방지 및 일관성 보장
 * - Service와 Listener 간 공유
 */
public class RedisKeyConstants {

    /**
     * 사용자 WebRTC 가용성 상태 키
     * Pattern: user:status:{userId}
     * Values: BUSY, AWAY, PAUSED
     */
    public static final String USER_STATUS_KEY = "user:status:";

    // ==================== Control 도메인 전용 Key Prefix ====================

    /**
     * Control 도메인 공통 Prefix
     */
    public static final String CONTROL_PREFIX = "lookie:control:";

    // ---------- Zone 관련 ----------

    /**
     * 구역 현황 요약 정보
     * Pattern: lookie:control:zone:{zoneId}:overview
     * Type: Hash
     * Fields: zoneName, workerCount, progressRate, status
     */
    public static final String ZONE_OVERVIEW = CONTROL_PREFIX + "zone:%d:overview";

    /**
     * 구역별 작업자 목록
     * Pattern: lookie:control:zone:{zoneId}:workers
     * Type: Set (Worker IDs)
     */
    public static final String ZONE_WORKERS = CONTROL_PREFIX + "zone:%d:workers";

    /**
     * 구역별 병목 작업자 순위
     * Pattern: lookie:control:zone:{zoneId}:bottleneck
     * Type: Sorted Set
     * Score: 작업 시작 후 경과 시간 (초)
     * Member: workerId
     */
    public static final String ZONE_BOTTLENECK = CONTROL_PREFIX + "zone:%d:bottleneck";

    // ---------- Worker 관련 ----------

    /**
     * 작업자 상태 정보
     * Pattern: lookie:control:worker:{workerId}:status
     * Type: Hash
     * Fields: name, workCount, processingSpeed, currentTaskProgress, status,
     * webrtcStatus
     */
    public static final String WORKER_STATUS = CONTROL_PREFIX + "worker:%d:status";

    /**
     * 작업자 위치 정보
     * Pattern: lookie:control:worker:{workerId}:location
     * Type: Hash
     * Fields: locationCode, lastUpdated
     */
    public static final String WORKER_LOCATION = CONTROL_PREFIX + "worker:%d:location";

    // ---------- Dashboard 관련 ----------

    /**
     * 대시보드 요약 통계
     * Pattern: lookie:control:dashboard:summary
     * Type: Hash
     * Fields: totalActiveWorkers, pendingIssues, completedIssues, totalProgressRate
     */
    public static final String DASHBOARD_SUMMARY = CONTROL_PREFIX + "dashboard:summary";

    // ==================== TTL 설정 (초 단위) ====================

    /**
     * 구역 현황 캐시 유효 시간 (60초)
     * - 실시간성 중요, 변경 빈도 중간
     */
    public static final long ZONE_OVERVIEW_TTL = 60;

    /**
     * 작업자 상태 캐시 유효 시간 (30초)
     * - 실시간성 매우 중요
     */
    public static final long WORKER_STATUS_TTL = 30;

    /**
     * 작업자 위치 캐시 유효 시간 (30초)
     * - 실시간 위치 추적
     */
    public static final long WORKER_LOCATION_TTL = 30;

    /**
     * 병목 순위 캐시 유효 시간 (60초)
     * - 병목 판단 로직 실행 주기와 동일
     */
    public static final long BOTTLENECK_TTL = 60;

    /**
     * 대시보드 요약 캐시 유효 시간 (60초)
     * - 집계 데이터, 변경 빈도 낮음
     */
    public static final long DASHBOARD_TTL = 60;

    // ==================== Inventory 관련 ====================

    /**
     * 재고 상태 캐시
     * Pattern: lookie:inventory:product:{productId}:location:{locationId}:state
     * Type: Hash
     * Fields: availableQty, damagedTempQty, lastEventId, lastEventType, updatedAt
     */
    public static final String INVENTORY_STATE = "lookie:inventory:product:%d:location:%d:state";

    /**
     * 재고 상태 캐시 유효 시간 (24시간)
     * - 장기 유지, miss 시 DB fallback
     */
    public static final long INVENTORY_TTL = 24 * 60 * 60; // 24 hours

    private RedisKeyConstants() {
        // Utility class - prevent instantiation
    }
}
