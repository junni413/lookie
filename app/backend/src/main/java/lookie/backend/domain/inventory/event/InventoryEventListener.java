package lookie.backend.domain.inventory.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.inventory.mapper.InventoryCurrentMapper;
import lookie.backend.domain.inventory.vo.InventoryCurrentVO;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * 재고 이벤트 리스너
 * - AFTER_COMMIT에만 실행되어 Redis 갱신
 * - 멱등성 보장 (last_event_id 비교)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InventoryEventListener {
    
    private final RedisTemplate<String, Object> redisTemplate;
    private final InventoryCurrentMapper currentMapper;
    
    private static final String INVENTORY_KEY_PREFIX = "lookie:inventory:product:%d:location:%d:state";
    private static final long INVENTORY_TTL = 24 * 60 * 60; // 24 hours
    
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onInventoryEvent(InventoryEvent event) {
        log.info("[InventoryListener] AFTER_COMMIT. eventId={}, type={}, product={}, location={}", 
            event.getEventId(), event.getEventType(), event.getProductId(), event.getLocationId());
        
        String key = String.format(INVENTORY_KEY_PREFIX, event.getProductId(), event.getLocationId());
        
        try {
            // 1. Redis 현재 상태 조회
            Map<Object, Object> redisState = redisTemplate.opsForHash().entries(key);
            
            // 2. 멱등성 체크 (last_event_id 비교)
            if (!redisState.isEmpty()) {
                Object lastEventIdObj = redisState.get("lastEventId");
                if (lastEventIdObj != null) {
                    Long lastEventId = Long.valueOf(lastEventIdObj.toString());
                    
                    if (event.getEventId() <= lastEventId) {
                        log.warn("[InventoryListener] Duplicate or old event detected. skip. eventId={}, lastEventId={}", 
                            event.getEventId(), lastEventId);
                        return;
                    }
                }
            }
            
            // 3. DB current에서 최신 상태 조회
            InventoryCurrentVO current = currentMapper.selectCurrent(
                event.getProductId(), 
                event.getLocationId()
            );
            
            if (current == null) {
                log.error("[InventoryListener] Current not found in DB. product={}, location={}", 
                    event.getProductId(), event.getLocationId());
                return;
            }
            
            // 4. Redis 갱신
            Map<String, Object> newState = new HashMap<>();
            newState.put("availableQty", current.getAvailableQty());
            newState.put("damagedTempQty", current.getDamagedTempQty());
            newState.put("lastEventId", current.getLastEventId());
            newState.put("lastEventType", current.getLastEventType());
            newState.put("updatedAt", System.currentTimeMillis());
            
            redisTemplate.opsForHash().putAll(key, newState);
            redisTemplate.expire(key, INVENTORY_TTL, TimeUnit.SECONDS);
            
            log.info("[InventoryListener] Redis updated successfully. product={}, location={}, available={}, damagedTemp={}", 
                event.getProductId(), event.getLocationId(), 
                current.getAvailableQty(), current.getDamagedTempQty());
            
        } catch (Exception e) {
            log.error("[InventoryListener] Failed to update Redis. eventId={}, error={}", 
                event.getEventId(), e.getMessage(), e);
            // Redis 갱신 실패는 치명적이지 않음 (다음 조회 시 DB fallback)
        }
    }
}
