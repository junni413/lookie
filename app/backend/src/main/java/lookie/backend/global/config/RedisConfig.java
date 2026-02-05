package lookie.backend.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Redis 설정 클래스
 * - Control 도메인 전용 RedisTemplate 구성
 * - 복잡한 객체(DTO)를 JSON으로 직렬화하여 저장
 */
@Configuration
public class RedisConfig {

    /**
     * Control 도메인 전용 RedisTemplate
     * 
     * <p>
     * 용도:
     * </p>
     * <ul>
     * <li>구역(Zone) 현황 캐싱</li>
     * <li>작업자(Worker) 상태 및 위치 정보 저장</li>
     * <li>대시보드 통계 데이터 캐싱</li>
     * </ul>
     * 
     * <p>
     * Serializer 전략:
     * </p>
     * <ul>
     * <li>Key: StringRedisSerializer (가독성, 예:
     * "lookie:control:zone:1:overview")</li>
     * <li>Value: GenericJackson2JsonRedisSerializer (DTO 객체를 JSON으로 직렬화)</li>
     * <li>Hash Key: StringRedisSerializer</li>
     * <li>Hash Value: GenericJackson2JsonRedisSerializer</li>
     * </ul>
     * 
     * @param connectionFactory Spring Boot Auto-Configuration이 제공하는
     *                          RedisConnectionFactory
     * @return Control 도메인 전용 RedisTemplate
     */
    @Bean(name = "controlRedisTemplate")
    public RedisTemplate<String, Object> controlRedisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // Key Serializer: String (사람이 읽을 수 있는 형태)
        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);

        // Value Serializer: JSON (복잡한 객체 저장 가능)
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer();
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);

        template.afterPropertiesSet();
        return template;
    }

    /**
     * 참고: StringRedisTemplate은 Spring Boot Auto-Configuration이 자동으로 생성
     * - 기존 코드(JWT, OTP, User Status 등)에서 사용 중
     * - 별도 Bean 정의 불필요
     */
}
