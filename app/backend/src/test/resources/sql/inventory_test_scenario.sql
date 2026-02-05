-- ==========================================
-- 재고 관리 시스템 통합 테스트 시나리오
-- ==========================================

-- 사전 조건: products, zone_locations 테이블에 데이터 존재

-- ==========================================
-- STEP 0: 초기화 (기존 데이터 삭제)
-- ==========================================
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE inventory_current;
TRUNCATE TABLE inventory_events;
SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- STEP 1: 초기 재고 세팅 (STOCK_INIT)
-- ==========================================
-- 상품 1번, 지번 1번에 초기 재고 100개
INSERT INTO inventory_events (event_type, product_id, location_id, quantity_change, reference_type, reference_id, created_by)
VALUES ('STOCK_INIT', 1, 1, 100, 'SYSTEM', NULL, NULL);

SET @last_event_id = LAST_INSERT_ID();

INSERT INTO inventory_current (product_id, location_id, available_qty, damaged_temp_qty, last_event_id, last_event_type, updated_by)
VALUES (1, 1, 100, 0, @last_event_id, 'STOCK_INIT', NULL);

-- ==========================================
-- STEP 2: 정상 집품 시뮬레이션 (PICK_NORMAL)
-- ==========================================
-- task_item_id=999 완료, 5개 출고
INSERT INTO inventory_events (event_type, product_id, location_id, quantity_change, reference_type, reference_id, created_by)
VALUES ('PICK_NORMAL', 1, 1, -5, 'TASK_ITEM', 999, 1);

SET @last_event_id = LAST_INSERT_ID();

UPDATE inventory_current 
SET available_qty = available_qty - 5,
    last_event_id = @last_event_id,
    last_event_type = 'PICK_NORMAL'
WHERE product_id = 1 AND location_id = 1;

-- ==========================================
-- STEP 3: 파손 임시 처리 (PICK_DAMAGED_TEMP)
-- ==========================================
-- issue_id=888 발생, WebRTC MISSED
INSERT INTO inventory_events (event_type, product_id, location_id, quantity_change, reference_type, reference_id, created_by)
VALUES ('PICK_DAMAGED_TEMP', 1, 1, -1, 'ISSUE', 888, 1);

SET @last_event_id = LAST_INSERT_ID();

UPDATE inventory_current 
SET available_qty = available_qty - 1,
    damaged_temp_qty = damaged_temp_qty + 1,
    last_event_id = @last_event_id,
    last_event_type = 'PICK_DAMAGED_TEMP'
WHERE product_id = 1 AND location_id = 1;

-- ==========================================
-- STEP 4-A: 파손 확정 (PICK_DAMAGED_FINAL)
-- ==========================================
-- 관리자가 파손 확정, qty_change=0 (마킹용)
INSERT INTO inventory_events (event_type, product_id, location_id, quantity_change, reference_type, reference_id, created_by)
VALUES ('PICK_DAMAGED_FINAL', 1, 1, 0, 'ISSUE', 888, 2);

SET @last_event_id = LAST_INSERT_ID();

UPDATE inventory_current 
SET last_event_id = @last_event_id,
    last_event_type = 'PICK_DAMAGED_FINAL'
WHERE product_id = 1 AND location_id = 1;

-- ==========================================
-- 결과 확인
-- ==========================================
SELECT '=== INVENTORY EVENTS ===' AS '';
SELECT event_id, event_type, product_id, location_id, quantity_change, reference_type, reference_id, created_at
FROM inventory_events
ORDER BY event_id;

SELECT '=== INVENTORY CURRENT ===' AS '';
SELECT product_id, location_id, available_qty, damaged_temp_qty, last_event_id, last_event_type
FROM inventory_current;

SELECT '=== EXPECTED RESULT ===' AS '';
SELECT 
    '재고: 100 → 95 (정상 집품) → 94 (파손 TEMP) → 94 (파손 FINAL)' AS scenario,
    'available_qty = 94, damaged_temp_qty = 1' AS expected;

-- ==========================================
-- STEP 4-B: 파손 취소 시나리오 (REVERT_DAMAGED)
-- ==========================================
-- 관리자가 정상 판정, +1 복구
-- INSERT INTO inventory_events (event_type, product_id, location_id, quantity_change, reference_type, reference_id, created_by)
-- VALUES ('REVERT_DAMAGED', 1, 1, 1, 'ISSUE', 888, 2);
-- 
-- UPDATE inventory_current 
-- SET available_qty = available_qty + 1,
--     damaged_temp_qty = damaged_temp_qty - 1,
--     last_event_id = LAST_INSERT_ID(),
--     last_event_type = 'REVERT_DAMAGED'
-- WHERE product_id = 1 AND location_id = 1;
-- 
-- 예상 결과: available_qty = 95, damaged_temp_qty = 0
