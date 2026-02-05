package lookie.backend.domain.inventory.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.inventory.event.InventoryEvent;
import lookie.backend.domain.inventory.mapper.InventoryCurrentMapper;
import lookie.backend.domain.inventory.mapper.InventoryEventMapper;
import lookie.backend.domain.inventory.vo.InventoryCurrentVO;
import lookie.backend.domain.inventory.vo.InventoryEventVO;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * 재고 관리 서비스
 * - 재고 이벤트 기록 및 current 업데이트
 * - Redis fallback 처리
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryService {
    
    private final InventoryEventMapper eventMapper;
    private final InventoryCurrentMapper currentMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final RedisTemplate<String, Object> redisTemplate;
    
    private static final String INVENTORY_KEY_PREFIX = "lookie:inventory:product:%d:location:%d:state";
    private static final long INVENTORY_TTL = 24 * 60 * 60; // 24 hours
    
    /**
     * 재고 이벤트 기록 (트랜잭션 내)
     * - inventory_events INSERT
     * - inventory_current UPDATE
     * - 이벤트 발행 (AFTER_COMMIT에서 Redis 갱신)
     */
    @Transactional
    public void recordEvent(
        String eventType,
        Long productId,
        Long locationId,
        int quantityChange,
        String referenceType,
        Long referenceId,
        Long createdBy
    ) {
        log.info("[Inventory] Recording event. type={}, product={}, location={}, qty={}", 
            eventType, productId, locationId, quantityChange);
        
        // 1. 이벤트 기록 (불변 로그)
        InventoryEventVO event = new InventoryEventVO();
        event.setEventType(eventType);
        event.setProductId(productId);
        event.setLocationId(locationId);
        event.setQuantityChange(quantityChange);
        event.setReferenceType(referenceType);
        event.setReferenceId(referenceId);
        event.setCreatedBy(createdBy);
        
        eventMapper.insert(event);
        Long eventId = event.getEventId();
        
        log.info("[Inventory] Event recorded. eventId={}", eventId);
        
        // 2. current 업데이트
        int updated = currentMapper.applyEvent(
            productId, locationId, eventType, quantityChange, eventId, createdBy
        );
        
        if (updated == 0) {
            log.warn("[Inventory] Current not found. Creating initial record. product={}, location={}", 
                productId, locationId);
            
            // inventory_current가 없으면 초기 생성
            InventoryCurrentVO current = new InventoryCurrentVO();
            current.setProductId(productId);
            current.setLocationId(locationId);
            current.setAvailableQty(quantityChange);
            current.setDamagedTempQty(0);
            current.setLastEventId(eventId);
            current.setLastEventType(eventType);
            current.setUpdatedBy(createdBy);
            
            currentMapper.insert(current);
        }
        
        // 3. 도메인 이벤트 발행 (AFTER_COMMIT에서 Redis 갱신)
        InventoryEvent domainEvent = InventoryEvent.builder()
            .eventId(eventId)
            .eventType(eventType)
            .productId(productId)
            .locationId(locationId)
            .quantityChange(quantityChange)
            .referenceType(referenceType)
            .referenceId(referenceId)
            .createdBy(createdBy)
            .build();
        
        eventPublisher.publishEvent(domainEvent);
        
        log.info("[Inventory] Event published for AFTER_COMMIT processing. eventId={}", eventId);
    }
    
    /**
     * 현재 재고 상태 조회 (Redis → DB fallback)
     */
    public Map<String, Object> getInventoryState(Long productId, Long locationId) {
        String key = String.format(INVENTORY_KEY_PREFIX, productId, locationId);
        
        // 1. Redis 조회
        Map<Object, Object> redisState = redisTemplate.opsForHash().entries(key);
        
        if (!redisState.isEmpty()) {
            log.debug("[Inventory] Redis hit. product={}, location={}", productId, locationId);
            return convertToStringMap(redisState);
        }
        
        // 2. Redis miss → DB fallback
        log.warn("[Inventory] Redis miss. Fallback to DB. product={}, location={}", 
            productId, locationId);
        
        InventoryCurrentVO current = currentMapper.selectCurrent(productId, locationId);
        
        if (current == null) {
            log.info("[Inventory] No inventory record found. product={}, location={}", 
                productId, locationId);
            return createEmptyState();
        }
        
        // 3. Redis 재생성
        rebuildRedisFromDB(productId, locationId, current);
        
        // 4. 상태 반환
        Map<String, Object> state = new HashMap<>();
        state.put("availableQty", current.getAvailableQty());
        state.put("damagedTempQty", current.getDamagedTempQty());
        state.put("lastEventId", current.getLastEventId());
        state.put("lastEventType", current.getLastEventType());
        
        return state;
    }
    
    /**
     * 초기 재고 세팅 (STOCK_INIT)
     */
    @Transactional
    public void initializeStock(
        Long productId,
        Long locationId,
        int initialQty,
        Long createdBy
    ) {
        log.info("[Inventory] Initializing stock. product={}, location={}, qty={}", 
            productId, locationId, initialQty);
        
        // events + current 동시 생성
        recordEvent(
            "STOCK_INIT",
            productId,
            locationId,
            initialQty,
            "SYSTEM",
            null,
            createdBy
        );
    }
    
    /**
     * DB → Redis 재생성
     */
    public void rebuildRedisFromDB(Long productId, Long locationId, InventoryCurrentVO current) {
        String key = String.format(INVENTORY_KEY_PREFIX, productId, locationId);
        
        Map<String, Object> state = new HashMap<>();
        state.put("availableQty", current.getAvailableQty());
        state.put("damagedTempQty", current.getDamagedTempQty());
        state.put("lastEventId", current.getLastEventId());
        state.put("lastEventType", current.getLastEventType());
        state.put("updatedAt", System.currentTimeMillis());
        
        redisTemplate.opsForHash().putAll(key, state);
        redisTemplate.expire(key, INVENTORY_TTL, TimeUnit.SECONDS);
        
        log.info("[Inventory] Redis rebuilt from DB. product={}, location={}", 
            productId, locationId);
    }
    
    private Map<String, Object> convertToStringMap(Map<Object, Object> redisMap) {
        Map<String, Object> result = new HashMap<>();
        redisMap.forEach((k, v) -> result.put(k.toString(), v));
        return result;
    }
    
    private Map<String, Object> createEmptyState() {
        Map<String, Object> state = new HashMap<>();
        state.put("availableQty", 0);
        state.put("damagedTempQty", 0);
        state.put("lastEventId", null);
        state.put("lastEventType", null);
        return state;
    }
}
