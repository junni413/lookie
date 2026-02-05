package lookie.backend.domain.inventory.service;

import lookie.backend.domain.inventory.mapper.InventoryCurrentMapper;
import lookie.backend.domain.inventory.mapper.InventoryEventMapper;
import lookie.backend.domain.inventory.vo.InventoryCurrentVO;
import lookie.backend.domain.inventory.vo.InventoryEventVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 재고 관리 시스템 통합 테스트
 * - 실제 DB, Redis와 연동하여 전체 흐름 검증
 * 
 * ⚠️ Phase 1: CI/CD 환경에 MySQL/Redis 미구축으로 비활성화
 * ✅ Phase 2: TestContainers 또는 CI/CD 환경 구축 후 활성화 예정
 */
@Disabled("Phase 2: CI/CD 환경 구축 후 활성화 (MySQL/Redis 필요)")
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class InventoryServiceIntegrationTest {

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private InventoryEventMapper eventMapper;

    @Autowired
    private InventoryCurrentMapper currentMapper;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private static final Long TEST_PRODUCT_ID = 999L;
    private static final Long TEST_LOCATION_ID = 888L;

    @BeforeEach
    void setUp() {
        // Redis 초기화
        String key = String.format("lookie:inventory:product:%d:location:%d:state", 
            TEST_PRODUCT_ID, TEST_LOCATION_ID);
        redisTemplate.delete(key);
    }

    @Test
    @DisplayName("초기 재고 세팅 (STOCK_INIT)")
    void testInitializeStock() {
        // Given
        int initialQty = 100;

        // When
        inventoryService.initializeStock(TEST_PRODUCT_ID, TEST_LOCATION_ID, initialQty, 1L);

        // Then
        InventoryCurrentVO current = currentMapper.selectCurrent(TEST_PRODUCT_ID, TEST_LOCATION_ID);
        assertThat(current).isNotNull();
        assertThat(current.getAvailableQty()).isEqualTo(100);
        assertThat(current.getDamagedTempQty()).isEqualTo(0);
        assertThat(current.getLastEventType()).isEqualTo("STOCK_INIT");

        // Event 확인
        InventoryEventVO event = eventMapper.findById(current.getLastEventId());
        assertThat(event.getEventType()).isEqualTo("STOCK_INIT");
        assertThat(event.getQuantityChange()).isEqualTo(100);
    }

    @Test
    @DisplayName("정상 집품 (PICK_NORMAL) - 재고 감소")
    void testPickNormal() {
        // Given: 초기 재고 100
        inventoryService.initializeStock(TEST_PRODUCT_ID, TEST_LOCATION_ID, 100, 1L);

        // When: 5개 집품
        inventoryService.recordEvent(
            "PICK_NORMAL",
            TEST_PRODUCT_ID,
            TEST_LOCATION_ID,
            -5,
            "TASK_ITEM",
            999L,
            1L
        );

        // Then
        InventoryCurrentVO current = currentMapper.selectCurrent(TEST_PRODUCT_ID, TEST_LOCATION_ID);
        assertThat(current.getAvailableQty()).isEqualTo(95); // 100 - 5
        assertThat(current.getDamagedTempQty()).isEqualTo(0);
        assertThat(current.getLastEventType()).isEqualTo("PICK_NORMAL");
    }

    @Test
    @DisplayName("파손 임시 처리 (PICK_DAMAGED_TEMP)")
    void testPickDamagedTemp() {
        // Given: 초기 재고 100
        inventoryService.initializeStock(TEST_PRODUCT_ID, TEST_LOCATION_ID, 100, 1L);

        // When: 파손 1개 임시 차감
        inventoryService.recordEvent(
            "PICK_DAMAGED_TEMP",
            TEST_PRODUCT_ID,
            TEST_LOCATION_ID,
            -1,
            "ISSUE",
            888L,
            1L
        );

        // Then
        InventoryCurrentVO current = currentMapper.selectCurrent(TEST_PRODUCT_ID, TEST_LOCATION_ID);
        assertThat(current.getAvailableQty()).isEqualTo(99); // 100 - 1
        assertThat(current.getDamagedTempQty()).isEqualTo(1); // 0 + 1
        assertThat(current.getLastEventType()).isEqualTo("PICK_DAMAGED_TEMP");
    }

    @Test
    @DisplayName("파손 확정 (PICK_DAMAGED_FINAL) - 추가 차감 없음")
    void testPickDamagedFinal() {
        // Given: 초기 100 → TEMP -1
        inventoryService.initializeStock(TEST_PRODUCT_ID, TEST_LOCATION_ID, 100, 1L);
        inventoryService.recordEvent("PICK_DAMAGED_TEMP", TEST_PRODUCT_ID, TEST_LOCATION_ID, 
            -1, "ISSUE", 888L, 1L);

        // When: 파손 확정 (qty=0, 마킹용)
        inventoryService.recordEvent(
            "PICK_DAMAGED_FINAL",
            TEST_PRODUCT_ID,
            TEST_LOCATION_ID,
            0, // 추가 차감 없음
            "ISSUE",
            888L,
            2L
        );

        // Then
        InventoryCurrentVO current = currentMapper.selectCurrent(TEST_PRODUCT_ID, TEST_LOCATION_ID);
        assertThat(current.getAvailableQty()).isEqualTo(99); // 변화 없음
        assertThat(current.getDamagedTempQty()).isEqualTo(1); // 변화 없음
        assertThat(current.getLastEventType()).isEqualTo("PICK_DAMAGED_FINAL");
    }

    @Test
    @DisplayName("파손 취소 (REVERT_DAMAGED) - 재고 복구")
    void testRevertDamaged() {
        // Given: 초기 100 → TEMP -1
        inventoryService.initializeStock(TEST_PRODUCT_ID, TEST_LOCATION_ID, 100, 1L);
        inventoryService.recordEvent("PICK_DAMAGED_TEMP", TEST_PRODUCT_ID, TEST_LOCATION_ID, 
            -1, "ISSUE", 888L, 1L);

        // When: 정상 판정 → 복구
        inventoryService.recordEvent(
            "REVERT_DAMAGED",
            TEST_PRODUCT_ID,
            TEST_LOCATION_ID,
            1, // 재고 복구
            "ISSUE",
            888L,
            2L
        );

        // Then
        InventoryCurrentVO current = currentMapper.selectCurrent(TEST_PRODUCT_ID, TEST_LOCATION_ID);
        assertThat(current.getAvailableQty()).isEqualTo(100); // 99 → 100 복구
        assertThat(current.getDamagedTempQty()).isEqualTo(0); // 1 → 0
        assertThat(current.getLastEventType()).isEqualTo("REVERT_DAMAGED");
    }

    @Test
    @DisplayName("Redis fallback - Redis miss 시 DB에서 복구")
    void testRedisFallback() {
        // Given: 초기 재고 100
        inventoryService.initializeStock(TEST_PRODUCT_ID, TEST_LOCATION_ID, 100, 1L);

        // Redis 캐시 삭제 (miss 시뮬레이션)
        String key = String.format("lookie:inventory:product:%d:location:%d:state", 
            TEST_PRODUCT_ID, TEST_LOCATION_ID);
        redisTemplate.delete(key);

        // When: 조회 (fallback 트리거)
        Map<String, Object> state = inventoryService.getInventoryState(TEST_PRODUCT_ID, TEST_LOCATION_ID);

        // Then
        assertThat(state).isNotNull();
        assertThat(state.get("availableQty")).isEqualTo(100);
        assertThat(state.get("damagedTempQty")).isEqualTo(0);

        // Redis 재생성 확인
        Map<Object, Object> redisState = redisTemplate.opsForHash().entries(key);
        assertThat(redisState).isNotEmpty();
    }

    @Test
    @DisplayName("전체 시나리오: 초기화 → 정상 집품 → 파손 → 확정")
    void testCompleteScenario() {
        // 1. 초기 재고 100
        inventoryService.initializeStock(TEST_PRODUCT_ID, TEST_LOCATION_ID, 100, 1L);

        // 2. 정상 집품 -5
        inventoryService.recordEvent("PICK_NORMAL", TEST_PRODUCT_ID, TEST_LOCATION_ID, 
            -5, "TASK_ITEM", 999L, 1L);

        InventoryCurrentVO afterNormal = currentMapper.selectCurrent(TEST_PRODUCT_ID, TEST_LOCATION_ID);
        assertThat(afterNormal.getAvailableQty()).isEqualTo(95);

        // 3. 파손 TEMP -1
        inventoryService.recordEvent("PICK_DAMAGED_TEMP", TEST_PRODUCT_ID, TEST_LOCATION_ID, 
            -1, "ISSUE", 888L, 1L);

        InventoryCurrentVO afterTemp = currentMapper.selectCurrent(TEST_PRODUCT_ID, TEST_LOCATION_ID);
        assertThat(afterTemp.getAvailableQty()).isEqualTo(94);
        assertThat(afterTemp.getDamagedTempQty()).isEqualTo(1);

        // 4. 파손 FINAL (마킹)
        inventoryService.recordEvent("PICK_DAMAGED_FINAL", TEST_PRODUCT_ID, TEST_LOCATION_ID, 
            0, "ISSUE", 888L, 2L);

        InventoryCurrentVO afterFinal = currentMapper.selectCurrent(TEST_PRODUCT_ID, TEST_LOCATION_ID);
        assertThat(afterFinal.getAvailableQty()).isEqualTo(94); // 변화 없음
        assertThat(afterFinal.getDamagedTempQty()).isEqualTo(1);
        assertThat(afterFinal.getLastEventType()).isEqualTo("PICK_DAMAGED_FINAL");

        // 5. 이벤트 히스토리 확인
        assertThat(eventMapper.findRecentEvents(TEST_PRODUCT_ID, TEST_LOCATION_ID, 10))
            .hasSize(4);
    }
}
