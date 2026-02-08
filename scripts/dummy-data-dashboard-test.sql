-- =====================================================
-- 관리자 대시보드 & AI 재배치 테스트용 더미 데이터
-- =====================================================
-- 실행 순서:
-- 1. 기존 users, zones, products 데이터가 있어야 함
-- 2. 이 스크립트 실행
-- =====================================================

-- 기존 테스트 데이터 정리
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE rebalance_snapshots;
TRUNCATE TABLE issues;
TRUNCATE TABLE batch_task_items;
TRUNCATE TABLE batch_tasks;
TRUNCATE TABLE batches;
TRUNCATE TABLE totes;
TRUNCATE TABLE zone_assignments;
TRUNCATE TABLE work_log_events;
TRUNCATE TABLE work_logs;
TRUNCATE TABLE inventory_events;
TRUNCATE TABLE inventory_current;
TRUNCATE TABLE zone_locations;
TRUNCATE TABLE zone_lines;
TRUNCATE TABLE products;
TRUNCATE TABLE users;
TRUNCATE TABLE zones;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO zones (zone_id)
VALUES (1), (2), (3), (4);

INSERT INTO users (
  user_id,
  role,
  password_hash,
  name,
  phone_number,
  email,
  is_active,
  assigned_zone_id,
  created_at,
  updated_at
)
VALUES
-- =========================
-- ZONE 1 (1~12)
-- =========================
(1,'WORKER','$2a$10$demo','김민준','010-3000-0001','worker1@lookie.com',TRUE,1,NOW(),NOW()),
(2,'WORKER','$2a$10$demo','이서준','010-3000-0002','worker2@lookie.com',TRUE,1,NOW(),NOW()),
(3,'WORKER','$2a$10$demo','박도윤','010-3000-0003','worker3@lookie.com',TRUE,1,NOW(),NOW()),
(4,'WORKER','$2a$10$demo','최지훈','010-3000-0004','worker4@lookie.com',TRUE,1,NOW(),NOW()),
(5,'WORKER','$2a$10$demo','정현우','010-3000-0005','worker5@lookie.com',TRUE,1,NOW(),NOW()),
(6,'WORKER','$2a$10$demo','강준혁','010-3000-0006','worker6@lookie.com',TRUE,1,NOW(),NOW()),
(7,'WORKER','$2a$10$demo','조성민','010-3000-0007','worker7@lookie.com',TRUE,1,NOW(),NOW()),
(8,'WORKER','$2a$10$demo','윤재호','010-3000-0008','worker8@lookie.com',TRUE,1,NOW(),NOW()),
(9,'WORKER','$2a$10$demo','장우진','010-3000-0009','worker9@lookie.com',TRUE,1,NOW(),NOW()),
(10,'WORKER','$2a$10$demo','임동현','010-3000-0010','worker10@lookie.com',TRUE,1,NOW(),NOW()),
(11,'WORKER','$2a$10$demo','한지호','010-3000-0011','worker11@lookie.com',TRUE,1,NOW(),NOW()),
(12,'WORKER','$2a$10$demo','신태영','010-3000-0012','worker12@lookie.com',TRUE,1,NOW(),NOW()),
-- =========================
-- ZONE 2 (13~24)
-- =========================
(13,'WORKER','$2a$10$demo','서강민','010-3000-0013','worker13@lookie.com',TRUE,2,NOW(),NOW()),
(14,'WORKER','$2a$10$demo','오승현','010-3000-0014','worker14@lookie.com',TRUE,2,NOW(),NOW()),
(15,'WORKER','$2a$10$demo','문재윤','010-3000-0015','worker15@lookie.com',TRUE,2,NOW(),NOW()),
(16,'WORKER','$2a$10$demo','배현석','010-3000-0016','worker16@lookie.com',TRUE,2,NOW(),NOW()),
(17,'WORKER','$2a$10$demo','유상훈','010-3000-0017','worker17@lookie.com',TRUE,2,NOW(),NOW()),
(18,'WORKER','$2a$10$demo','노준호','010-3000-0018','worker18@lookie.com',TRUE,2,NOW(),NOW()),
(19,'WORKER','$2a$10$demo','전성우','010-3000-0019','worker19@lookie.com',TRUE,2,NOW(),NOW()),
(20,'WORKER','$2a$10$demo','백종현','010-3000-0020','worker20@lookie.com',TRUE,2,NOW(),NOW()),
(21,'WORKER','$2a$10$demo','남기훈','010-3000-0021','worker21@lookie.com',TRUE,2,NOW(),NOW()),
(22,'WORKER','$2a$10$demo','류동욱','010-3000-0022','worker22@lookie.com',TRUE,2,NOW(),NOW()),
(23,'WORKER','$2a$10$demo','심재현','010-3000-0023','worker23@lookie.com',TRUE,2,NOW(),NOW()),
(24,'WORKER','$2a$10$demo','곽민석','010-3000-0024','worker24@lookie.com',TRUE,2,NOW(),NOW()),
-- =========================
-- ZONE 3 (25~36)
-- =========================
(25,'WORKER','$2a$10$demo','허준영','010-3000-0025','worker25@lookie.com',TRUE,3,NOW(),NOW()),
(26,'WORKER','$2a$10$demo','안태훈','010-3000-0026','worker26@lookie.com',TRUE,3,NOW(),NOW()),
(27,'WORKER','$2a$10$demo','송민규','010-3000-0027','worker27@lookie.com',TRUE,3,NOW(),NOW()),
(28,'WORKER','$2a$10$demo','홍석진','010-3000-0028','worker28@lookie.com',TRUE,3,NOW(),NOW()),
(29,'WORKER','$2a$10$demo','고대현','010-3000-0029','worker29@lookie.com',TRUE,3,NOW(),NOW()),
(30,'WORKER','$2a$10$demo','차성훈','010-3000-0030','worker30@lookie.com',TRUE,3,NOW(),NOW()),
(31,'WORKER','$2a$10$demo','우지환','010-3000-0031','worker31@lookie.com',TRUE,3,NOW(),NOW()),
(32,'WORKER','$2a$10$demo','신우석','010-3000-0032','worker32@lookie.com',TRUE,3,NOW(),NOW()),
(33,'WORKER','$2a$10$demo','조현수','010-3000-0033','worker33@lookie.com',TRUE,3,NOW(),NOW()),
(34,'WORKER','$2a$10$demo','문성빈','010-3000-0034','worker34@lookie.com',TRUE,3,NOW(),NOW()),
(35,'WORKER','$2a$10$demo','김태성','010-3000-0035','worker35@lookie.com',TRUE,3,NOW(),NOW()),
(36,'WORKER','$2a$10$demo','이상윤','010-3000-0036','worker36@lookie.com',TRUE,3,NOW(),NOW()),
-- =========================
-- ZONE 4 (37~47)
-- =========================
(37,'WORKER','$2a$10$demo','박진우','010-3000-0037','worker37@lookie.com',TRUE,4,NOW(),NOW()),
(38,'WORKER','$2a$10$demo','최영준','010-3000-0038','worker38@lookie.com',TRUE,4,NOW(),NOW()),
(39,'WORKER','$2a$10$demo','정민호','010-3000-0039','worker39@lookie.com',TRUE,4,NOW(),NOW()),
(40,'WORKER','$2a$10$demo','강성우','010-3000-0040','worker40@lookie.com',TRUE,4,NOW(),NOW()),
(41,'WORKER','$2a$10$demo','김동현','010-3000-0041','worker41@lookie.com',TRUE,4,NOW(),NOW()),
(42,'WORKER','$2a$10$demo','이재훈','010-3000-0042','worker42@lookie.com',TRUE,4,NOW(),NOW()),
(43,'WORKER','$2a$10$demo','박상민','010-3000-0043','worker43@lookie.com',TRUE,4,NOW(),NOW()),
(44,'WORKER','$2a$10$demo','최원석','010-3000-0044','worker44@lookie.com',TRUE,4,NOW(),NOW()),
(45,'WORKER','$2a$10$demo','정우성','010-3000-0045','worker45@lookie.com',TRUE,4,NOW(),NOW()),
(46,'WORKER','$2a$10$demo','한동훈','010-3000-0046','worker46@lookie.com',TRUE,4,NOW(),NOW()),
(47,'WORKER','$2a$10$demo','윤성호','010-3000-0047','worker47@lookie.com',TRUE,4,NOW(),NOW());

INSERT INTO users (
  role,
  password_hash,
  name,
  phone_number,
  email,
  is_active,
  assigned_zone_id,
  created_at,
  updated_at
)
VALUES
('ADMIN','$2a$10$demo','김도현','010-9000-0001','admin1@lookie.com',TRUE,1,NOW(),NOW()),
('ADMIN','$2a$10$demo','이준혁','010-9000-0002','admin2@lookie.com',TRUE,1,NOW(),NOW()),
('ADMIN','$2a$10$demo','박성훈','010-9000-0003','admin3@lookie.com',TRUE,2,NOW(),NOW()),
('ADMIN','$2a$10$demo','최재원','010-9000-0004','admin4@lookie.com',TRUE,2,NOW(),NOW()),
('ADMIN','$2a$10$demo','정수빈','010-9000-0005','admin5@lookie.com',TRUE,3,NOW(),NOW()),
('ADMIN','$2a$10$demo','한승우','010-9000-0006','admin6@lookie.com',TRUE,3,NOW(),NOW()),
('ADMIN','$2a$10$demo','오세진','010-9000-0007','admin7@lookie.com',TRUE,4,NOW(),NOW()),
('ADMIN','$2a$10$demo','윤지후','010-9000-0008','admin8@lookie.com',TRUE,4,NOW(),NOW());

INSERT INTO zone_lines (zone_id, line_name, is_active)
VALUES
-- Zone 1
(1, '01', true),
(1, '02', true),
(1, '03', true),
(1, '04', true),
(1, '05', true),
(1, '06', true),
(1, '07', true),
(1, '08', true),
(1, '09', true),
(1, '10', true),
(1, '11', true),
(1, '12', true),
-- Zone 2
(2, '01', true),
(2, '02', true),
(2, '03', true),
(2, '04', true),
(2, '05', true),
(2, '06', true),
(2, '07', true),
(2, '08', true),
(2, '09', true),
(2, '10', true),
(2, '11', true),
(2, '12', true),
-- Zone 3
(3, '01', true),
(3, '02', true),
(3, '03', true),
(3, '04', true),
(3, '05', true),
(3, '06', true),
(3, '07', true),
(3, '08', true),
(3, '09', true),
(3, '10', true),
(3, '11', true),
(3, '12', true),
-- Zone 4
(4, '01', true),
(4, '02', true),
(4, '03', true),
(4, '04', true),
(4, '05', true),
(4, '06', true),
(4, '07', true),
(4, '08', true),
(4, '09', true),
(4, '10', true),
(4, '11', true),
(4, '12', true);

INSERT INTO zone_locations (
  zone_id,
  line_id,
  location_code,
  x,
  y,
  is_active
)
SELECT
  zl.zone_id,
  zl.line_id,
  CONCAT(
    zl.zone_id, '-', LPAD(zl.line_id, 2, '0'), '-', LPAD(loc.seq, 2, '0')
  ) AS location_code,
  -- 더미 좌표값
  (ASCII(zl.line_name) - ASCII('A') + 1) * 10 AS x,
  loc.seq * 5 AS y,
  true AS is_active
FROM zone_lines zl
CROSS JOIN (
  SELECT 1 AS seq UNION ALL
  SELECT 2 UNION ALL
  SELECT 3 UNION ALL
  SELECT 4 UNION ALL
  SELECT 5 UNION ALL
  SELECT 6
) loc
ORDER BY zl.zone_id, zl.line_id, loc.seq;

INSERT INTO products (
  product_id,
  barcode,
  product_name,
  product_image,
  zone_id
)
VALUES
(101, 'Z1-BANANA', '바나나', NULL, 1),
(102, 'Z1-TOMATO', '토마토', NULL, 1),
(103, 'Z1-STRAWBERRY', '딸기', NULL, 1),
(104, 'Z1-PEACH', '복숭아', NULL, 1),
(105, 'Z1-SHINE', '샤인머스켓', NULL, 1),
(201, 'Z2-APPLE', '사과', NULL, 2),
(202, 'Z2-CARROT', '당근', NULL, 2),
(203, 'Z2-LETTUCE', '상추', NULL, 2),
(204, 'Z2-CUCUMBER', '오이', NULL, 2),
(205, 'Z2-PAPRIKA', '파프리카', NULL, 2),
(301, 'Z3-ONION', '양파', NULL, 3),
(302, 'Z3-POTATO', '감자', NULL, 3),
(303, 'Z3-GARLIC', '마늘', NULL, 3),
(304, 'Z3-CABBAGE', '양배추', NULL, 3),
(305, 'Z3-SPINACH', '시금치', NULL, 3),
(401, 'Z4-RICE', '쌀', NULL, 4),
(402, 'Z4-WATER', '생수', NULL, 4),
(403, 'Z4-FLOUR', '밀가루', NULL, 4),
(404, 'Z4-OIL', '식용유', NULL, 4),
(405, 'Z4-SUGAR', '설탕', NULL, 4);

-- =====================
-- ZONE 1 : 과일
-- =====================
UPDATE products SET
  barcode = 'PROD-001',
  product_name = 'GAP 인증 달콤한 바나나 1kg'
WHERE product_id = 101;

UPDATE products SET
  barcode = 'PROD-002',
  product_name = '완숙 토마토 2kg 박스'
WHERE product_id = 102;

UPDATE products SET
  barcode = 'PROD-003',
  product_name = '국산 설향 딸기 500g'
WHERE product_id = 103;

UPDATE products SET
  barcode = 'PROD-004',
  product_name = '당도선별 복숭아 4입'
WHERE product_id = 104;

UPDATE products SET
  barcode = 'PROD-005',
  product_name = '고당도 샤인머스켓 800g'
WHERE product_id = 105;

-- =====================
-- ZONE 2 : 채소
-- =====================
UPDATE products SET
  barcode = 'PROD-006',
  product_name = '아삭한 부사 사과 3kg'
WHERE product_id = 201;

UPDATE products SET
  barcode = 'PROD-007',
  product_name = '국내산 흙당근 1kg'
WHERE product_id = 202;

UPDATE products SET
  barcode = 'PROD-008',
  product_name = '친환경 유기농 상추 200g'
WHERE product_id = 203;

UPDATE products SET
  barcode = 'PROD-009',
  product_name = '국산 백오이 5입'
WHERE product_id = 204;

UPDATE products SET
  barcode = 'PROD-010',
  product_name = '컬러 파프리카 혼합 3입'
WHERE product_id = 205;

-- =====================
-- ZONE 3 : 근채 / 엽채
-- =====================
UPDATE products SET
  barcode = 'PROD-011',
  product_name = '국내산 햇양파 2kg'
WHERE product_id = 301;

UPDATE products SET
  barcode = 'PROD-012',
  product_name = '포슬포슬 감자 3kg'
WHERE product_id = 302;

UPDATE products SET
  barcode = 'PROD-013',
  product_name = '국산 마늘 500g'
WHERE product_id = 303;

UPDATE products SET
  barcode = 'PROD-014',
  product_name = '신선한 양배추 1통'
WHERE product_id = 304;

UPDATE products SET
  barcode = 'PROD-015',
  product_name = '무농약 시금치 300g'
WHERE product_id = 305;

-- =====================
-- ZONE 4 : 생필품
-- =====================
UPDATE products SET
  barcode = 'PROD-016',
  product_name = '2025년산 경기미 10kg'
WHERE product_id = 401;

UPDATE products SET
  barcode = 'PROD-017',
  product_name = '제주 삼다수 2L x 6병'
WHERE product_id = 402;

UPDATE products SET
  barcode = 'PROD-018',
  product_name = '중력분 밀가루 2kg'
WHERE product_id = 403;

UPDATE products SET
  barcode = 'PROD-019',
  product_name = '국내산 해바라기유 900ml'
WHERE product_id = 404;

UPDATE products SET
  barcode = 'PROD-020',
  product_name = '백설 하얀설탕 3kg'
WHERE product_id = 405;

-- 복숭아 → 홈런볼
UPDATE products SET
  barcode = 'PROD-004',
  product_name = '해태 홈런볼 초코 146g'
WHERE product_id = 104;

-- 샤인머스켓 → 눈을 감자
UPDATE products SET
  barcode = 'PROD-005',
  product_name = '오리온 눈을감자 오리지널 113g'
WHERE product_id = 105;

-- =====================================================
-- 1. BATCHES (배치 생성)
-- =====================================================
INSERT INTO batches (
  batch_id,
  batch_round,
  status,
  deadline_at,
  created_at
)
VALUES
(1, 1, 'IN_PROGRESS', DATE_ADD(NOW(), INTERVAL 4 HOUR), NOW()),
(2, 2, 'IN_PROGRESS', DATE_ADD(NOW(), INTERVAL 8 HOUR), NOW());

-- =====================================================
-- 2. TOTES (토트 박스 생성)
-- =====================================================
INSERT INTO totes (tote_id, barcode, is_active)
VALUES
(1, 'TOTE-001', TRUE),
(2, 'TOTE-002', TRUE),
(3, 'TOTE-003', TRUE),
(4, 'TOTE-004', TRUE),
(5, 'TOTE-005', TRUE),
(6, 'TOTE-006', TRUE),
(7, 'TOTE-007', TRUE),
(8, 'TOTE-008', TRUE),
(9, 'TOTE-009', TRUE),
(10, 'TOTE-010', TRUE),
(11, 'TOTE-011', TRUE),
(12, 'TOTE-012', TRUE),
(13, 'TOTE-013', TRUE),
(14, 'TOTE-014', TRUE),
(15, 'TOTE-015', TRUE),
(16, 'TOTE-016', TRUE),
(17, 'TOTE-017', TRUE),
(18, 'TOTE-018', TRUE),
(19, 'TOTE-019', TRUE),
(20, 'TOTE-020', TRUE),
(21, 'TOTE-021', TRUE),
(22, 'TOTE-022', TRUE),
(23, 'TOTE-023', TRUE),
(24, 'TOTE-024', TRUE),
(25, 'TOTE-025', TRUE),
(26, 'TOTE-026', TRUE),
(27, 'TOTE-027', TRUE),
(28, 'TOTE-028', TRUE),
(29, 'TOTE-029', TRUE),
(30, 'TOTE-030', TRUE),
(31, 'TOTE-031', TRUE),
(32, 'TOTE-032', TRUE),
(33, 'TOTE-033', TRUE),
(34, 'TOTE-034', TRUE),
(35, 'TOTE-035', TRUE),
(36, 'TOTE-036', TRUE),
(37, 'TOTE-037', TRUE),
(38, 'TOTE-038', TRUE),
(39, 'TOTE-039', TRUE),
(40, 'TOTE-040', TRUE),
(41, 'TOTE-041', TRUE),
(42, 'TOTE-042', TRUE),
(43, 'TOTE-043', TRUE),
(44, 'TOTE-044', TRUE),
(45, 'TOTE-045', TRUE),
(46, 'TOTE-046', TRUE),
(47, 'TOTE-047', TRUE),
(48, 'TOTE-048', TRUE),
(49, 'TOTE-049', TRUE),
(50, 'TOTE-050', TRUE);

-- =====================================================
-- 3. WORK_LOGS (근무 기록 - 활성 작업자만)
-- =====================================================
-- Zone 1 작업자 (1~12): 6명 출근 (적음 - 이동 대상이 필요)
INSERT INTO work_logs (worker_id, started_at, planned_end_at)
SELECT
  user_id,
  DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR) AS started_at,
  DATE_ADD(DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR), INTERVAL 8 HOUR) AS planned_end_at
FROM users
WHERE user_id BETWEEN 1 AND 6 AND role = 'WORKER';

-- Zone 2 작업자 (13~24): 8명 출근
INSERT INTO work_logs (worker_id, started_at, planned_end_at)
SELECT
  user_id,
  DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR) AS started_at,
  DATE_ADD(DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR), INTERVAL 8 HOUR) AS planned_end_at
FROM users
WHERE user_id BETWEEN 13 AND 20 AND role = 'WORKER';

-- Zone 3 작업자 (25~36): 10명 출근
INSERT INTO work_logs (worker_id, started_at, planned_end_at)
SELECT
  user_id,
  DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR) AS started_at,
  DATE_ADD(DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR), INTERVAL 8 HOUR) AS planned_end_at
FROM users
WHERE user_id BETWEEN 25 AND 34 AND role = 'WORKER';

-- Zone 4 작업자 (37~47): 11명 출근 (많음 - 이동 출발지)
INSERT INTO work_logs (worker_id, started_at, planned_end_at)
SELECT
  user_id,
  DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR) AS started_at,
  DATE_ADD(DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR), INTERVAL 8 HOUR) AS planned_end_at
FROM users
WHERE user_id BETWEEN 37 AND 47 AND role = 'WORKER';

-- =====================================================
-- 4. WORK_LOG_EVENTS (근무 이벤트)
-- =====================================================
INSERT INTO work_log_events (work_log_id, event_type, occurred_at)
SELECT work_log_id, 'START', started_at
FROM work_logs;

-- 일부 작업자는 일시정지/재개 이벤트 추가
INSERT INTO work_log_events (work_log_id, event_type, occurred_at)
SELECT
  work_log_id,
  'PAUSE',
  DATE_ADD(started_at, INTERVAL 1 HOUR)
FROM work_logs
WHERE work_log_id % 3 = 0;

INSERT INTO work_log_events (work_log_id, event_type, occurred_at)
SELECT
  work_log_id,
  'RESUME',
  DATE_ADD(started_at, INTERVAL 75 MINUTE)
FROM work_logs
WHERE work_log_id % 3 = 0;

-- =====================================================
-- 5. ZONE_ASSIGNMENTS (구역 배정 이력)
-- =====================================================
-- 현재 활성 작업자들에 대한 zone 배정
INSERT INTO zone_assignments (worker_id, zone_id, started_at)
SELECT
  wl.worker_id,
  u.assigned_zone_id,
  wl.started_at
FROM work_logs wl
JOIN users u ON wl.worker_id = u.user_id
WHERE wl.ended_at IS NULL;

-- =====================================================
-- 6. BATCH_TASKS (작업 할당)
-- =====================================================
-- Zone 1: 30개 작업 (완료 10, 진행 10, 대기 10) - 주의
INSERT INTO batch_tasks (
  batch_id,
  worker_id,
  zone_id,
  status,
  tote_id,
  started_at,
  completed_at,
  created_at,
  updated_at
)
SELECT
  1 AS batch_id,
  (1 + (seq % 6)) AS worker_id,
  1 AS zone_id,
  CASE
    WHEN seq <= 10 THEN 'COMPLETED'
    WHEN seq <= 20 THEN 'IN_PROGRESS'
    ELSE 'UNASSIGNED'
  END AS status,
  CASE
    WHEN seq <= 20 THEN seq
    ELSE NULL
  END AS tote_id,
  CASE
    WHEN seq <= 20 THEN DATE_SUB(NOW(), INTERVAL (30 - seq) * 5 MINUTE)
    ELSE NULL
  END AS started_at,
  CASE
    WHEN seq <= 10 THEN DATE_SUB(NOW(), INTERVAL (30 - seq) * 5 - 3 MINUTE)
    ELSE NULL
  END AS completed_at,
  NOW() AS created_at,
  NOW() AS updated_at
FROM (
  SELECT 1 AS seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL
  SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL
  SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL
  SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL
  SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL SELECT 25 UNION ALL
  SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29 UNION ALL SELECT 30
) nums;

-- Zone 2: 25개 작업 (완료 15, 진행 7, 대기 3) - 양호
INSERT INTO batch_tasks (
  batch_id,
  worker_id,
  zone_id,
  status,
  tote_id,
  started_at,
  completed_at,
  created_at,
  updated_at
)
SELECT
  1 AS batch_id,
  (13 + (seq % 8)) AS worker_id,
  2 AS zone_id,
  CASE
    WHEN seq <= 15 THEN 'COMPLETED'
    WHEN seq <= 22 THEN 'IN_PROGRESS'
    ELSE 'UNASSIGNED'
  END AS status,
  CASE
    WHEN seq <= 22 THEN (30 + seq)
    ELSE NULL
  END AS tote_id,
  CASE
    WHEN seq <= 22 THEN DATE_SUB(NOW(), INTERVAL (25 - seq) * 5 MINUTE)
    ELSE NULL
  END AS started_at,
  CASE
    WHEN seq <= 15 THEN DATE_SUB(NOW(), INTERVAL (25 - seq) * 5 - 3 MINUTE)
    ELSE NULL
  END AS completed_at,
  NOW() AS created_at,
  NOW() AS updated_at
FROM (
  SELECT 1 AS seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL
  SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL
  SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL
  SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL
  SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL SELECT 25
) nums;

-- Zone 3: 40개 작업 (완료 20, 진행 13, 대기 7) - 양호
INSERT INTO batch_tasks (
  batch_id,
  worker_id,
  zone_id,
  status,
  tote_id,
  started_at,
  completed_at,
  created_at,
  updated_at
)
SELECT
  1 AS batch_id,
  (25 + (seq % 10)) AS worker_id,
  3 AS zone_id,
  CASE
    WHEN seq <= 20 THEN 'COMPLETED'
    WHEN seq <= 33 THEN 'IN_PROGRESS'
    ELSE 'UNASSIGNED'
  END AS status,
  CASE
    WHEN seq <= 33 THEN (50 + seq)
    ELSE NULL
  END AS tote_id,
  CASE
    WHEN seq <= 33 THEN DATE_SUB(NOW(), INTERVAL (40 - seq) * 3 MINUTE)
    ELSE NULL
  END AS started_at,
  CASE
    WHEN seq <= 20 THEN DATE_SUB(NOW(), INTERVAL (40 - seq) * 3 - 2 MINUTE)
    ELSE NULL
  END AS completed_at,
  NOW() AS created_at,
  NOW() AS updated_at
FROM (
  SELECT 1 AS seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL
  SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL
  SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL
  SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL
  SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL SELECT 25 UNION ALL
  SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29 UNION ALL SELECT 30 UNION ALL
  SELECT 31 UNION ALL SELECT 32 UNION ALL SELECT 33 UNION ALL SELECT 34 UNION ALL SELECT 35 UNION ALL
  SELECT 36 UNION ALL SELECT 37 UNION ALL SELECT 38 UNION ALL SELECT 39 UNION ALL SELECT 40
) nums;

-- Zone 4: 20개 작업 (완료 18, 진행 2, 대기 0) - 거의 완료
INSERT INTO batch_tasks (
  batch_id,
  worker_id,
  zone_id,
  status,
  tote_id,
  started_at,
  completed_at,
  created_at,
  updated_at
)
SELECT
  1 AS batch_id,
  (37 + (seq % 11)) AS worker_id,
  4 AS zone_id,
  CASE
    WHEN seq <= 18 THEN 'COMPLETED'
    ELSE 'IN_PROGRESS'
  END AS status,
  CASE
    WHEN seq <= 20 THEN (70 + seq)
    ELSE NULL
  END AS tote_id,
  DATE_SUB(NOW(), INTERVAL (20 - seq) * 6 MINUTE) AS started_at,
  CASE
    WHEN seq <= 18 THEN DATE_SUB(NOW(), INTERVAL (20 - seq) * 6 - 4 MINUTE)
    ELSE NULL
  END AS completed_at,
  NOW() AS created_at,
  NOW() AS updated_at
FROM (
  SELECT 1 AS seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL
  SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL
  SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL
  SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
) nums;

-- =====================================================
-- 7. BATCH_TASK_ITEMS (작업 아이템)
-- =====================================================
-- 각 task마다 2~5개의 상품 할당
-- Zone 1 제품 사용 (product_id: 101~105)
INSERT INTO batch_task_items (
  batch_task_id,
  product_id,
  location_id,
  required_qty,
  picked_qty,
  status
)
SELECT
  bt.batch_task_id,
  101 + (FLOOR(RAND() * 5)) AS product_id,
  (1 + FLOOR(RAND() * 72)) AS location_id,
  (1 + FLOOR(RAND() * 3)) AS required_qty,
  CASE
    WHEN bt.status = 'COMPLETED' THEN (1 + FLOOR(RAND() * 3))
    WHEN bt.status = 'IN_PROGRESS' THEN FLOOR(RAND() * 2)
    ELSE 0
  END AS picked_qty,
  CASE
    WHEN bt.status = 'COMPLETED' THEN 'DONE'
    WHEN bt.status = 'IN_PROGRESS' AND RAND() > 0.5 THEN 'PENDING'
    ELSE 'PENDING'
  END AS status
FROM batch_tasks bt
CROSS JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3) items
WHERE bt.zone_id = 1
LIMIT 90;

-- Zone 2 제품 사용 (product_id: 201~205)
INSERT INTO batch_task_items (
  batch_task_id,
  product_id,
  location_id,
  required_qty,
  picked_qty,
  status
)
SELECT
  bt.batch_task_id,
  201 + (FLOOR(RAND() * 5)) AS product_id,
  (73 + FLOOR(RAND() * 72)) AS location_id, -- zone 2의 location_id
  (1 + FLOOR(RAND() * 3)) AS required_qty,
  CASE
    WHEN bt.status = 'COMPLETED' THEN (1 + FLOOR(RAND() * 3))
    WHEN bt.status = 'IN_PROGRESS' THEN FLOOR(RAND() * 2)
    ELSE 0
  END AS picked_qty,
  CASE
    WHEN bt.status = 'COMPLETED' THEN 'DONE'
    WHEN bt.status = 'IN_PROGRESS' AND RAND() > 0.5 THEN 'PENDING'
    ELSE 'PENDING'
  END AS status
FROM batch_tasks bt
CROSS JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3) items
WHERE bt.zone_id = 2
LIMIT 75;

-- Zone 3 제품 사용 (product_id: 301~305)
INSERT INTO batch_task_items (
  batch_task_id,
  product_id,
  location_id,
  required_qty,
  picked_qty,
  status
)
SELECT
  bt.batch_task_id,
  301 + (FLOOR(RAND() * 5)) AS product_id,
  (145 + FLOOR(RAND() * 72)) AS location_id, -- zone 3의 location_id
  (1 + FLOOR(RAND() * 3)) AS required_qty,
  CASE
    WHEN bt.status = 'COMPLETED' THEN (1 + FLOOR(RAND() * 3))
    WHEN bt.status = 'IN_PROGRESS' THEN FLOOR(RAND() * 2)
    ELSE 0
  END AS picked_qty,
  CASE
    WHEN bt.status = 'COMPLETED' THEN 'DONE'
    WHEN bt.status = 'IN_PROGRESS' AND RAND() > 0.5 THEN 'PENDING'
    ELSE 'PENDING'
  END AS status
FROM batch_tasks bt
CROSS JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3) items
WHERE bt.zone_id = 3
LIMIT 120;

-- Zone 4 제품 사용 (product_id: 401~405)
INSERT INTO batch_task_items (
  batch_task_id,
  product_id,
  location_id,
  required_qty,
  picked_qty,
  status
)
SELECT
  bt.batch_task_id,
  401 + (FLOOR(RAND() * 5)) AS product_id,
  (217 + FLOOR(RAND() * 72)) AS location_id, -- zone 4의 location_id
  (1 + FLOOR(RAND() * 3)) AS required_qty,
  CASE
    WHEN bt.status = 'COMPLETED' THEN (1 + FLOOR(RAND() * 3))
    WHEN bt.status = 'IN_PROGRESS' THEN FLOOR(RAND() * 2)
    ELSE 0
  END AS picked_qty,
  CASE
    WHEN bt.status = 'COMPLETED' THEN 'DONE'
    ELSE 'PENDING'
  END AS status
FROM batch_tasks bt
CROSS JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3) items
WHERE bt.zone_id = 4
LIMIT 60;

-- picked_qty가 required_qty를 초과하지 않도록 수정
UPDATE batch_task_items
SET picked_qty = required_qty
WHERE picked_qty > required_qty;

-- COMPLETED task의 모든 아이템은 DONE으로
UPDATE batch_task_items bti
JOIN batch_tasks bt ON bti.batch_task_id = bt.batch_task_id
SET bti.status = 'DONE', bti.picked_qty = bti.required_qty
WHERE bt.status = 'COMPLETED';

-- last_scanned_at 업데이트 (DONE 상태인 아이템은 오늘 스캔됨)
UPDATE batch_task_items bti
JOIN batch_tasks bt ON bti.batch_task_id = bt.batch_task_id
SET bti.last_scanned_at = NOW()
WHERE bti.status = 'DONE';

-- =====================================================
-- 8. REBALANCE_SNAPSHOTS (AI 재배치 스냅샷 데이터)
-- =====================================================
-- Use a single snapshot timestamp across all zones to ensure latest batch selection returns all rows.
SET @snap_ts = NOW();
-- Zone 1: 주의 (남은 아이템 800개, 6명, 평균 속도 10개/시간 → 2시간 동안 120개만 처리 가능, risk=680 - 작업자 부족)
INSERT INTO rebalance_snapshots (
  ts, batch_id, worker_id, zone_id,
  progress, remaining_qty,
  time_to_planned_end_min, time_to_deadline_min,
  zone_backlog, zone_active_workers, zone_location_cnt, zone_blocking_issue_cnt,
  worker_speed_30m_avg, speed_label,
  picked_total, required_total
)
SELECT
  @snap_ts as ts,
  1 as batch_id,
  user_id as worker_id,
  1 as zone_id,
  0.27 as progress,
  CASE user_id
    WHEN 1 THEN 140
    WHEN 2 THEN 135
    WHEN 3 THEN 130
    WHEN 4 THEN 130
    WHEN 5 THEN 135
    WHEN 6 THEN 130
  END as remaining_qty,  -- 합계 800
  -- time_to_planned_end_min: 남은 작업량 / 속도 * 60분
  CASE user_id
    WHEN 1 THEN CEIL(140 / 10.0 * 60)  -- 840분
    WHEN 2 THEN CEIL(135 / 10.0 * 60)  -- 810분
    WHEN 3 THEN CEIL(130 / 10.0 * 60)  -- 780분
    WHEN 4 THEN CEIL(130 / 10.0 * 60)  -- 780분
    WHEN 5 THEN CEIL(135 / 10.0 * 60)  -- 810분
    WHEN 6 THEN CEIL(130 / 10.0 * 60)  -- 780분
  END as time_to_planned_end_min,
  120 as time_to_deadline_min,  -- 마감까지 2시간 = 120분
  800 as zone_backlog,  -- 400 → 800 (2시간 동안 120개만 처리 가능 → risk=680)
  6 as zone_active_workers,
  72 as zone_location_cnt,
  0 as zone_blocking_issue_cnt,
  ROUND(9 + RAND() * 2, 2) as worker_speed_30m_avg, -- 9~11개/시간
  ROUND(9 + RAND() * 2, 2) as speed_label,
  CASE user_id
    WHEN 1 THEN 5
    WHEN 2 THEN 5
    WHEN 3 THEN 5
    WHEN 4 THEN 5
    WHEN 5 THEN 5
    WHEN 6 THEN 5
  END as picked_total,  -- 합계 30
  CASE user_id
    WHEN 1 THEN 145
    WHEN 2 THEN 140
    WHEN 3 THEN 135
    WHEN 4 THEN 135
    WHEN 5 THEN 140
    WHEN 6 THEN 135
  END as required_total  -- 합계 830 (picked 30 + remaining 800)
FROM users
WHERE user_id BETWEEN 1 AND 6 AND role = 'WORKER';

-- Zone 2: 양호 (남은 아이템 50개, 8명, 평균 속도 15개/시간 → 예상 3.33시간 < 4시간 마감)
INSERT INTO rebalance_snapshots (
  ts, batch_id, worker_id, zone_id,
  progress, remaining_qty,
  time_to_planned_end_min, time_to_deadline_min,
  zone_backlog, zone_active_workers, zone_location_cnt, zone_blocking_issue_cnt,
  worker_speed_30m_avg, speed_label,
  picked_total, required_total
)
SELECT
  @snap_ts as ts,
  1 as batch_id,
  user_id as worker_id,
  2 as zone_id,
  0.60 as progress,
  CASE user_id
    WHEN 13 THEN 7
    WHEN 14 THEN 6
    WHEN 15 THEN 6
    WHEN 16 THEN 7
    WHEN 17 THEN 6
    WHEN 18 THEN 6
    WHEN 19 THEN 6
    WHEN 20 THEN 6
  END as remaining_qty,
  -- time_to_planned_end_min: 남은 작업량 / 속도 * 60분
  CASE user_id
    WHEN 13 THEN CEIL(7 / 15.0 * 60)   -- 28분
    WHEN 14 THEN CEIL(6 / 15.0 * 60)   -- 24분
    WHEN 15 THEN CEIL(6 / 15.0 * 60)   -- 24분
    WHEN 16 THEN CEIL(7 / 15.0 * 60)   -- 28분
    WHEN 17 THEN CEIL(6 / 15.0 * 60)   -- 24분
    WHEN 18 THEN CEIL(6 / 15.0 * 60)   -- 24분
    WHEN 19 THEN CEIL(6 / 15.0 * 60)   -- 24분
    WHEN 20 THEN CEIL(6 / 15.0 * 60)   -- 24분
  END as time_to_planned_end_min,
  240 as time_to_deadline_min,  -- 마감까지 4시간 = 240분
  50 as zone_backlog,
  8 as zone_active_workers,
  72 as zone_location_cnt,
  0 as zone_blocking_issue_cnt,
  ROUND(14 + RAND() * 2, 2) as worker_speed_30m_avg, -- 14~16개/시간
  ROUND(14 + RAND() * 2, 2) as speed_label,
  CASE user_id
    WHEN 13 THEN 5
    WHEN 14 THEN 6
    WHEN 15 THEN 6
    WHEN 16 THEN 5
    WHEN 17 THEN 6
    WHEN 18 THEN 6
    WHEN 19 THEN 5
    WHEN 20 THEN 6
  END as picked_total,
  CASE user_id
    WHEN 13 THEN 12
    WHEN 14 THEN 12
    WHEN 15 THEN 12
    WHEN 16 THEN 12
    WHEN 17 THEN 12
    WHEN 18 THEN 12
    WHEN 19 THEN 11
    WHEN 20 THEN 12
  END as required_total
FROM users
WHERE user_id BETWEEN 13 AND 20 AND role = 'WORKER';

-- Zone 3: 양호 (남은 아이템 70개, 10명, 평균 속도 20개/시간 → 예상 3.5시간, 3시간 < 3.5시간 < 4시간 마감)
INSERT INTO rebalance_snapshots (
  ts, batch_id, worker_id, zone_id,
  progress, remaining_qty,
  time_to_planned_end_min, time_to_deadline_min,
  zone_backlog, zone_active_workers, zone_location_cnt, zone_blocking_issue_cnt,
  worker_speed_30m_avg, speed_label,
  picked_total, required_total
)
SELECT
  @snap_ts as ts,
  1 as batch_id,
  user_id as worker_id,
  3 as zone_id,
  0.46 as progress,
  CASE user_id
    WHEN 25 THEN 8
    WHEN 26 THEN 7
    WHEN 27 THEN 7
    WHEN 28 THEN 7
    WHEN 29 THEN 7
    WHEN 30 THEN 7
    WHEN 31 THEN 7
    WHEN 32 THEN 7
    WHEN 33 THEN 7
    WHEN 34 THEN 6
  END as remaining_qty,
  -- time_to_planned_end_min: 남은 작업량 / 속도 * 60분
  CASE user_id
    WHEN 25 THEN CEIL(8 / 20.0 * 60)   -- 24분
    WHEN 26 THEN CEIL(7 / 20.0 * 60)   -- 21분
    WHEN 27 THEN CEIL(7 / 20.0 * 60)   -- 21분
    WHEN 28 THEN CEIL(7 / 20.0 * 60)   -- 21분
    WHEN 29 THEN CEIL(7 / 20.0 * 60)   -- 21분
    WHEN 30 THEN CEIL(7 / 20.0 * 60)   -- 21분
    WHEN 31 THEN CEIL(7 / 20.0 * 60)   -- 21분
    WHEN 32 THEN CEIL(7 / 20.0 * 60)   -- 21분
    WHEN 33 THEN CEIL(7 / 20.0 * 60)   -- 21분
    WHEN 34 THEN CEIL(6 / 20.0 * 60)   -- 18분
  END as time_to_planned_end_min,
  240 as time_to_deadline_min,  -- 마감까지 4시간 = 240분
  70 as zone_backlog,
  10 as zone_active_workers,
  72 as zone_location_cnt,
  3 as zone_blocking_issue_cnt,
  ROUND(19 + RAND() * 2, 2) as worker_speed_30m_avg, -- 19~21개/시간
  ROUND(19 + RAND() * 2, 2) as speed_label,
  CASE user_id
    WHEN 25 THEN 5
    WHEN 26 THEN 6
    WHEN 27 THEN 6
    WHEN 28 THEN 6
    WHEN 29 THEN 6
    WHEN 30 THEN 6
    WHEN 31 THEN 6
    WHEN 32 THEN 6
    WHEN 33 THEN 7
    WHEN 34 THEN 6
  END as picked_total,
  CASE user_id
    WHEN 25 THEN 13
    WHEN 26 THEN 13
    WHEN 27 THEN 13
    WHEN 28 THEN 13
    WHEN 29 THEN 13
    WHEN 30 THEN 13
    WHEN 31 THEN 13
    WHEN 32 THEN 13
    WHEN 33 THEN 13
    WHEN 34 THEN 12
  END as required_total
FROM users
WHERE user_id BETWEEN 25 AND 34 AND role = 'WORKER';

-- Zone 4: 안정 (남은 아이템 3개, 11명, 평균 속도 30개/시간 → 예상 0.1시간 << 4시간 마감, 작업자 과잉)
INSERT INTO rebalance_snapshots (
  ts, batch_id, worker_id, zone_id,
  progress, remaining_qty,
  time_to_planned_end_min, time_to_deadline_min,
  zone_backlog, zone_active_workers, zone_location_cnt, zone_blocking_issue_cnt,
  worker_speed_30m_avg, speed_label,
  picked_total, required_total
)
SELECT
  @snap_ts as ts,
  1 as batch_id,
  user_id as worker_id,
  4 as zone_id,
  0.95 as progress,
  CASE user_id
    WHEN 37 THEN 1
    WHEN 38 THEN 1
    WHEN 39 THEN 1
    ELSE 0
  END as remaining_qty,
  -- time_to_planned_end_min: 남은 작업량 / 속도 * 60분
  CASE user_id
    WHEN 37 THEN CEIL(1 / 30.0 * 60)   -- 2분
    WHEN 38 THEN CEIL(1 / 30.0 * 60)   -- 2분
    WHEN 39 THEN CEIL(1 / 30.0 * 60)   -- 2분
    ELSE 0                                -- 0분 (작업 없음)
  END as time_to_planned_end_min,
  240 as time_to_deadline_min,  -- 마감까지 4시간 = 240분
  3 as zone_backlog,
  11 as zone_active_workers,
  72 as zone_location_cnt,
  0 as zone_blocking_issue_cnt,
  ROUND(29 + RAND() * 2, 2) as worker_speed_30m_avg, -- 29~31개/시간
  ROUND(29 + RAND() * 2, 2) as speed_label,
  CASE user_id
    WHEN 37 THEN 4
    WHEN 38 THEN 5
    WHEN 39 THEN 5
    WHEN 40 THEN 5
    WHEN 41 THEN 5
    WHEN 42 THEN 6
    WHEN 43 THEN 6
    WHEN 44 THEN 6
    WHEN 45 THEN 6
    WHEN 46 THEN 5
    WHEN 47 THEN 4
  END as picked_total,
  CASE user_id
    WHEN 37 THEN 5
    WHEN 38 THEN 6
    WHEN 39 THEN 6
    WHEN 40 THEN 5
    WHEN 41 THEN 5
    WHEN 42 THEN 6
    WHEN 43 THEN 6
    WHEN 44 THEN 6
    WHEN 45 THEN 6
    WHEN 46 THEN 5
    WHEN 47 THEN 4
  END as required_total
FROM users
WHERE user_id BETWEEN 37 AND 47 AND role = 'WORKER';

-- =====================================================
-- 9. ISSUES (일부 이슈 데이터 - OPEN 상태)
-- =====================================================
-- Zone 1에서 2건의 이슈
INSERT INTO issues (
  batch_task_id,
  worker_id,
  batch_task_item_id,
  issue_type,
  status,
  urgency,
  issue_handling,
  admin_required,
  note,
  created_at
)
SELECT
  bt.batch_task_id,
  bt.worker_id,
  bti.batch_task_item_id,
  'DAMAGED' AS issue_type,
  'OPEN' AS status,
  1 AS urgency,
  'BLOCKING' AS issue_handling,
  TRUE AS admin_required,
  '바나나 외피 손상 의심' AS note,
  DATE_SUB(NOW(), INTERVAL 30 MINUTE)
FROM batch_tasks bt
JOIN batch_task_items bti ON bt.batch_task_id = bti.batch_task_id
WHERE bt.zone_id = 1 AND bt.status = 'IN_PROGRESS'
LIMIT 1;

INSERT INTO issues (
  batch_task_id,
  worker_id,
  batch_task_item_id,
  issue_type,
  status,
  urgency,
  issue_handling,
  admin_required,
  note,
  created_at
)
SELECT
  bt.batch_task_id,
  bt.worker_id,
  bti.batch_task_item_id,
  'OUT_OF_STOCK' AS issue_type,
  'OPEN' AS status,
  3 AS urgency,
  'NON_BLOCKING' AS issue_handling,
  FALSE AS admin_required,
  '딸기 재고 부족' AS note,
  DATE_SUB(NOW(), INTERVAL 15 MINUTE)
FROM batch_tasks bt
JOIN batch_task_items bti ON bt.batch_task_id = bti.batch_task_id
WHERE bt.zone_id = 1 AND bt.status = 'IN_PROGRESS'
LIMIT 1 OFFSET 1;

-- Zone 3에서 3건의 이슈 (가장 바쁜 구역)
INSERT INTO issues (
  batch_task_id,
  worker_id,
  batch_task_item_id,
  issue_type,
  status,
  urgency,
  issue_handling,
  admin_required,
  note,
  created_at
)
SELECT
  bt.batch_task_id,
  bt.worker_id,
  bti.batch_task_item_id,
  'DAMAGED' AS issue_type,
  'OPEN' AS status,
  1 AS urgency,
  'BLOCKING' AS issue_handling,
  TRUE AS admin_required,
  '양파 포장 파손' AS note,
  DATE_SUB(NOW(), INTERVAL 45 MINUTE)
FROM batch_tasks bt
JOIN batch_task_items bti ON bt.batch_task_id = bti.batch_task_id
WHERE bt.zone_id = 3 AND bt.status = 'IN_PROGRESS'
LIMIT 1;

INSERT INTO issues (
  batch_task_id,
  worker_id,
  batch_task_item_id,
  issue_type,
  status,
  urgency,
  issue_handling,
  admin_required,
  note,
  created_at
)
SELECT
  bt.batch_task_id,
  bt.worker_id,
  bti.batch_task_item_id,
  'DAMAGED' AS issue_type,
  'OPEN' AS status,
  3 AS urgency,
  'BLOCKING' AS issue_handling,
  TRUE AS admin_required,
  '감자 일부 썩음' AS note,
  DATE_SUB(NOW(), INTERVAL 20 MINUTE)
FROM batch_tasks bt
JOIN batch_task_items bti ON bt.batch_task_id = bti.batch_task_id
WHERE bt.zone_id = 3 AND bt.status = 'IN_PROGRESS'
LIMIT 1 OFFSET 1;

INSERT INTO issues (
  batch_task_id,
  worker_id,
  batch_task_item_id,
  issue_type,
  status,
  urgency,
  issue_handling,
  admin_required,
  note,
  created_at
)
SELECT
  bt.batch_task_id,
  bt.worker_id,
  bti.batch_task_item_id,
  'OUT_OF_STOCK' AS issue_type,
  'OPEN' AS status,
  5 AS urgency,
  'NON_BLOCKING' AS issue_handling,
  FALSE AS admin_required,
  '시금치 소량 부족' AS note,
  DATE_SUB(NOW(), INTERVAL 10 MINUTE)
FROM batch_tasks bt
JOIN batch_task_items bti ON bt.batch_task_id = bti.batch_task_id
WHERE bt.zone_id = 3 AND bt.status = 'IN_PROGRESS'
LIMIT 1 OFFSET 2;

-- =====================================================
-- 10. 데이터 검증 쿼리
-- =====================================================
SELECT '=== 구역별 작업 현황 ===' AS info;
SELECT
  z.zone_id,
  COUNT(DISTINCT CASE WHEN wl.ended_at IS NULL THEN bt.worker_id END) AS active_workers,
  COUNT(CASE WHEN bt.status = 'UNASSIGNED' THEN 1 END) AS unassigned_tasks,
  COUNT(CASE WHEN bt.status = 'IN_PROGRESS' THEN 1 END) AS in_progress_tasks,
  COUNT(CASE WHEN bt.status = 'COMPLETED' THEN 1 END) AS completed_tasks,
  COUNT(bt.batch_task_id) AS total_tasks,
  ROUND(COUNT(CASE WHEN bt.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(bt.batch_task_id), 2) AS completion_rate
FROM zones z
LEFT JOIN batch_tasks bt ON z.zone_id = bt.zone_id
LEFT JOIN work_logs wl ON bt.worker_id = wl.worker_id AND wl.ended_at IS NULL
GROUP BY z.zone_id
ORDER BY z.zone_id;

SELECT '=== 이슈 현황 ===' AS info;
SELECT
  zone_id,
  issue_type,
  urgency,
  COUNT(*) AS issue_count
FROM issues i
JOIN batch_tasks bt ON i.batch_task_id = bt.batch_task_id
WHERE i.status = 'OPEN'
GROUP BY zone_id, issue_type, urgency
ORDER BY zone_id, urgency;

SELECT '=== 작업자별 작업량 (IN_PROGRESS) ===' AS info;
SELECT
  bt.worker_id,
  u.name,
  bt.zone_id,
  COUNT(*) AS task_count,
  SUM(CASE WHEN bt.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
  SUM(CASE WHEN bt.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress,
  SUM(CASE WHEN bt.status = 'UNASSIGNED' THEN 1 ELSE 0 END) AS unassigned
FROM batch_tasks bt
JOIN users u ON bt.worker_id = u.user_id
GROUP BY bt.worker_id, u.name, bt.zone_id
HAVING in_progress > 0
ORDER BY bt.zone_id, task_count DESC;

SELECT '=== 데이터 생성 완료 ===' AS result;
