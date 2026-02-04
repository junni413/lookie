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

    private RedisKeyConstants() {
        // Utility class - prevent instantiation
    }
}
