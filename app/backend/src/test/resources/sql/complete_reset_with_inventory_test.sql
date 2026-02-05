-- ==========================================
-- 완전 초기화 + 재고 테스트용 더미 데이터
-- ==========================================

-- ==========================================
-- STEP 1: 완전 초기화 (모든 테이블 비우기)
-- ==========================================
SET FOREIGN_KEY_CHECKS = 0;

-- 재고 관련
TRUNCATE TABLE inventory_current;
TRUNCATE TABLE inventory_events;

-- 이슈 관련
TRUNCATE TABLE ai_judgments;
TRUNCATE TABLE issue_images;
TRUNCATE TABLE webrtc_calls;
TRUNCATE TABLE issues;

-- 작업 관련
TRUNCATE TABLE batch_task_items;
TRUNCATE TABLE batch_tasks;
TRUNCATE TABLE batches;

-- 재배치 관련
TRUNCATE TABLE rebalance_snapshots;

-- 작업 로그
TRUNCATE TABLE work_log_events;
TRUNCATE TABLE work_logs;

-- 구역 배정
TRUNCATE TABLE zone_assignments;
TRUNCATE TABLE admin_assignments;

-- 토트
TRUNCATE TABLE totes;

-- 통화 기록
TRUNCATE TABLE call_history;

-- 상품/지번
TRUNCATE TABLE products;
TRUNCATE TABLE zone_locations;
TRUNCATE TABLE zone_lines;

-- 사용자/구역 (가장 마지막)
TRUNCATE TABLE users;
TRUNCATE TABLE zones;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- STEP 2: 기본 데이터 생성 (최소한)
-- ==========================================

-- 2-1. Zones (구역 4개)
INSERT INTO zones (zone_id) VALUES 
(1), (2), (3), (4);

-- 2-2. Zone Lines (각 구역에 라인 1개씩)
INSERT INTO zone_lines (line_id, zone_id, line_name, is_active) VALUES
(1, 1, 'A', 1),
(2, 2, 'B', 1),
(3, 3, 'C', 1),
(4, 4, 'D', 1);

-- 2-3. Zone Locations (각 구역에 지번 5개씩, 총 20개)
INSERT INTO zone_locations (location_id, zone_id, line_id, location_code, x, y, is_active) VALUES
-- Zone 1
(1, 1, 1, 'A-01-01', 10.50000, 20.50000, 1),
(2, 1, 1, 'A-01-02', 10.60000, 20.60000, 1),
(3, 1, 1, 'A-01-03', 10.70000, 20.70000, 1),
(4, 1, 1, 'A-01-04', 10.80000, 20.80000, 1),
(5, 1, 1, 'A-01-05', 10.90000, 20.90000, 1),
-- Zone 2
(6, 2, 2, 'B-01-01', 30.50000, 40.50000, 1),
(7, 2, 2, 'B-01-02', 30.60000, 40.60000, 1),
(8, 2, 2, 'B-01-03', 30.70000, 40.70000, 1),
(9, 2, 2, 'B-01-04', 30.80000, 40.80000, 1),
(10, 2, 2, 'B-01-05', 30.90000, 40.90000, 1),
-- Zone 3
(11, 3, 3, 'C-01-01', 50.50000, 60.50000, 1),
(12, 3, 3, 'C-01-02', 50.60000, 60.60000, 1),
(13, 3, 3, 'C-01-03', 50.70000, 60.70000, 1),
(14, 3, 3, 'C-01-04', 50.80000, 60.80000, 1),
(15, 3, 3, 'C-01-05', 50.90000, 60.90000, 1),
-- Zone 4
(16, 4, 4, 'D-01-01', 70.50000, 80.50000, 1),
(17, 4, 4, 'D-01-02', 70.60000, 80.60000, 1),
(18, 4, 4, 'D-01-03', 70.70000, 80.70000, 1),
(19, 4, 4, 'D-01-04', 70.80000, 80.80000, 1),
(20, 4, 4, 'D-01-05', 70.90000, 80.90000, 1);

-- 2-4. Users (작업자 2명, 관리자 2명)
INSERT INTO users (user_id, role, password_hash, name, phone_number, email, is_active, assigned_zone_id) VALUES
-- 작업자
(1, 'WORKER', '$2a$10$dummyhash1', '김작업', '010-1111-1111', 'worker1@test.com', 1, 1),
(2, 'WORKER', '$2a$10$dummyhash2', '이작업', '010-2222-2222', 'worker2@test.com', 1, 2),
-- 관리자
(3, 'ADMIN', '$2a$10$dummyhash3', '박관리', '010-3333-3333', 'admin1@test.com', 1, NULL),
(4, 'ADMIN', '$2a$10$dummyhash4', '최관리', '010-4444-4444', 'admin2@test.com', 1, NULL);

-- 2-5. Products (상품 10개)
INSERT INTO products (product_id, barcode, product_name, product_image, location_id, zone_id) VALUES
(1, 'PRD001', '테스트상품1', 'https://via.placeholder.com/150', 1, 1),
(2, 'PRD002', '테스트상품2', 'https://via.placeholder.com/150', 2, 1),
(3, 'PRD003', '테스트상품3', 'https://via.placeholder.com/150', 3, 1),
(4, 'PRD004', '테스트상품4', 'https://via.placeholder.com/150', 6, 2),
(5, 'PRD005', '테스트상품5', 'https://via.placeholder.com/150', 7, 2),
(6, 'PRD006', '테스트상품6', 'https://via.placeholder.com/150', 11, 3),
(7, 'PRD007', '테스트상품7', 'https://via.placeholder.com/150', 12, 3),
(8, 'PRD008', '테스트상품8', 'https://via.placeholder.com/150', 16, 4),
(9, 'PRD009', '테스트상품9', 'https://via.placeholder.com/150', 17, 4),
(10, 'PRD010', '테스트상품10', 'https://via.placeholder.com/150', 18, 4);

-- 2-6. Totes (토트 5개)
INSERT INTO totes (tote_id, barcode, is_active) VALUES
(1, 'TOTE-001', 1),
(2, 'TOTE-002', 1),
(3, 'TOTE-003', 1),
(4, 'TOTE-004', 1),
(5, 'TOTE-005', 1);

-- ==========================================
-- STEP 3: 재고 테스트 시나리오
-- ==========================================

-- 3-1. 초기 재고 세팅 (상품 1~5번에 각각 100개씩)
INSERT INTO inventory_events (event_type, product_id, location_id, quantity_change, reference_type, reference_id, created_by)
VALUES 
('STOCK_INIT', 1, 1, 100, 'SYSTEM', NULL, NULL),
('STOCK_INIT', 2, 2, 100, 'SYSTEM', NULL, NULL),
('STOCK_INIT', 3, 3, 100, 'SYSTEM', NULL, NULL),
('STOCK_INIT', 4, 6, 100, 'SYSTEM', NULL, NULL),
('STOCK_INIT', 5, 7, 100, 'SYSTEM', NULL, NULL);

-- event_id를 변수로 저장 (각 이벤트 ID)
SET @event1 = LAST_INSERT_ID();
SET @event2 = @event1 + 1;
SET @event3 = @event1 + 2;
SET @event4 = @event1 + 3;
SET @event5 = @event1 + 4;

INSERT INTO inventory_current (product_id, location_id, available_qty, damaged_temp_qty, last_event_id, last_event_type, updated_by)
VALUES 
(1, 1, 100, 0, @event1, 'STOCK_INIT', NULL),
(2, 2, 100, 0, @event2, 'STOCK_INIT', NULL),
(3, 3, 100, 0, @event3, 'STOCK_INIT', NULL),
(4, 6, 100, 0, @event4, 'STOCK_INIT', NULL),
(5, 7, 100, 0, @event5, 'STOCK_INIT', NULL);

-- 3-2. 정상 집품 시뮬레이션 (상품1에서 5개 출고)
INSERT INTO inventory_events (event_type, product_id, location_id, quantity_change, reference_type, reference_id, created_by)
VALUES ('PICK_NORMAL', 1, 1, -5, 'TASK_ITEM', 999, 1);

SET @last_event_id = LAST_INSERT_ID();

UPDATE inventory_current 
SET available_qty = available_qty - 5,
    last_event_id = @last_event_id,
    last_event_type = 'PICK_NORMAL'
WHERE product_id = 1 AND location_id = 1;

-- 3-3. 파손 임시 처리 (상품1에서 1개 파손 임시)
INSERT INTO inventory_events (event_type, product_id, location_id, quantity_change, reference_type, reference_id, created_by)
VALUES ('PICK_DAMAGED_TEMP', 1, 1, -1, 'ISSUE', 888, 1);

SET @last_event_id = LAST_INSERT_ID();

UPDATE inventory_current 
SET available_qty = available_qty - 1,
    damaged_temp_qty = damaged_temp_qty + 1,
    last_event_id = @last_event_id,
    last_event_type = 'PICK_DAMAGED_TEMP'
WHERE product_id = 1 AND location_id = 1;

-- 3-4. 파손 확정 (qty=0, 마킹용)
INSERT INTO inventory_events (event_type, product_id, location_id, quantity_change, reference_type, reference_id, created_by)
VALUES ('PICK_DAMAGED_FINAL', 1, 1, 0, 'ISSUE', 888, 3);

SET @last_event_id = LAST_INSERT_ID();

UPDATE inventory_current 
SET last_event_id = @last_event_id,
    last_event_type = 'PICK_DAMAGED_FINAL'
WHERE product_id = 1 AND location_id = 1;

-- ==========================================
-- STEP 4: 결과 확인
-- ==========================================
SELECT '========================================' AS '';
SELECT '데이터베이스 초기화 완료!' AS '';
SELECT '========================================' AS '';

SELECT '' AS '';
SELECT '=== 1. ZONES (구역) ===' AS '';
SELECT zone_id FROM zones ORDER BY zone_id;

SELECT '' AS '';
SELECT '=== 2. ZONE_LOCATIONS (지번) ===' AS '';
SELECT location_id, zone_id, location_code FROM zone_locations ORDER BY location_id LIMIT 10;

SELECT '' AS '';
SELECT '=== 3. USERS (사용자) ===' AS '';
SELECT user_id, role, name, phone_number FROM users ORDER BY user_id;

SELECT '' AS '';
SELECT '=== 4. PRODUCTS (상품) ===' AS '';
SELECT product_id, barcode, product_name, location_id, zone_id FROM products ORDER BY product_id;

SELECT '' AS '';
SELECT '=== 5. INVENTORY_EVENTS (재고 이벤트) ===' AS '';
SELECT event_id, event_type, product_id, location_id, quantity_change, reference_type, reference_id
FROM inventory_events
ORDER BY event_id;

SELECT '' AS '';
SELECT '=== 6. INVENTORY_CURRENT (현재 재고 상태) ===' AS '';
SELECT product_id, location_id, available_qty, damaged_temp_qty, last_event_id, last_event_type
FROM inventory_current
ORDER BY product_id;

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT '✅ 재고 테스트 시나리오 결과' AS '';
SELECT '========================================' AS '';
SELECT 
    product_id,
    location_id,
    available_qty AS '가용재고',
    damaged_temp_qty AS '파손임시',
    last_event_type AS '마지막이벤트'
FROM inventory_current
WHERE product_id = 1 AND location_id = 1;

SELECT '' AS '';
SELECT '예상 결과: 상품1 → 가용재고=94, 파손임시=1' AS '';
SELECT '계산: 100(초기) - 5(정상집품) - 1(파손TEMP) = 94' AS '';
SELECT '' AS '';
