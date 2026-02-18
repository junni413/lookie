-- =====================================================
-- 愿由ъ옄 ??쒕낫??& AI ?щ같移??뚯뒪?몄슜 ?붾? ?곗씠??
-- =====================================================
-- ?ㅽ뻾 ?쒖꽌:
-- 1. 湲곗〈 users, zones, products ?곗씠?곌? ?덉뼱????
-- 2. ???ㅽ겕由쏀듃 ?ㅽ뻾
-- =====================================================

-- 湲곗〈 ?뚯뒪???곗씠???뺣━
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
WITH RECURSIVE seq AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 47
)
SELECT
  n AS user_id,
  'WORKER' AS role,
  '' AS password_hash,
  CONCAT('Worker', LPAD(n, 4, '0')) AS name,
  CONCAT('010-3000-', LPAD(n, 4, '0')) AS phone_number,
  CONCAT('worker', n, '@lookie.com') AS email,
  TRUE AS is_active,
  CASE
    WHEN n <= 12 THEN 1
    WHEN n <= 24 THEN 2
    WHEN n <= 36 THEN 3
    ELSE 4
  END AS assigned_zone_id,
  NOW() AS created_at,
  NOW() AS updated_at
FROM seq;

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
('ADMIN','','AdminA1','010-9000-0001','admin1@lookie.com',TRUE,1,NOW(),NOW()),
('ADMIN','','AdminA2','010-9000-0002','admin2@lookie.com',TRUE,1,NOW(),NOW()),
('ADMIN','','AdminB1','010-9000-0003','admin3@lookie.com',TRUE,2,NOW(),NOW()),
('ADMIN','','AdminB2','010-9000-0004','admin4@lookie.com',TRUE,2,NOW(),NOW()),
('ADMIN','','AdminC1','010-9000-0005','admin5@lookie.com',TRUE,3,NOW(),NOW()),
('ADMIN','','AdminC2','010-9000-0006','admin6@lookie.com',TRUE,3,NOW(),NOW()),
('ADMIN','','AdminD1','010-9000-0007','admin7@lookie.com',TRUE,4,NOW(),NOW()),
('ADMIN','','AdminD2','010-9000-0008','admin8@lookie.com',TRUE,4,NOW(),NOW()),
('ADMIN','','유동훈','010-9000-0099','ydh@lookie.com',TRUE,1,NOW(),NOW());

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
    CASE zl.zone_id
      WHEN 1 THEN 'A'
      WHEN 2 THEN 'B'
      WHEN 3 THEN 'C'
      WHEN 4 THEN 'D'
      ELSE 'Z'
    END,
    '-', LPAD(zl.line_name, 2, '0'), '-', LPAD(loc.seq, 2, '0')
  ) AS location_code,
  -- ?붾? 醫뚰몴媛?
  CAST(zl.line_name AS UNSIGNED) * 10 AS x,
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

-- =========================
-- Products (Sanitized)
-- =========================
INSERT INTO products (
  product_id,
  barcode,
  product_name,
  product_image,
  zone_id
)
VALUES
(101,'Z1-001','Z1 Product 01',NULL,1),
(102,'Z1-002','Z1 Product 02',NULL,1),
(103,'Z1-003','Z1 Product 03',NULL,1),
(104,'Z1-004','Z1 Product 04',NULL,1),
(105,'Z1-005','Z1 Product 05',NULL,1),
(201,'Z2-001','Z2 Product 01',NULL,2),
(202,'Z2-002','Z2 Product 02',NULL,2),
(203,'Z2-003','Z2 Product 03',NULL,2),
(204,'Z2-004','Z2 Product 04',NULL,2),
(205,'Z2-005','Z2 Product 05',NULL,2),
(301,'Z3-001','Z3 Product 01',NULL,3),
(302,'Z3-002','Z3 Product 02',NULL,3),
(303,'Z3-003','Z3 Product 03',NULL,3),
(304,'Z3-004','Z3 Product 04',NULL,3),
(305,'Z3-005','Z3 Product 05',NULL,3),
(401,'Z4-001','Z4 Product 01',NULL,4),
(402,'Z4-002','Z4 Product 02',NULL,4),
(403,'Z4-003','Z4 Product 03',NULL,4),
(404,'Z4-004','Z4 Product 04',NULL,4),
(405,'Z4-005','Z4 Product 05',NULL,4);

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
-- 2. TOTES (?좏듃 諛뺤뒪 ?앹꽦)
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
-- 3. WORK_LOGS (洹쇰Т 湲곕줉 - ?쒖꽦 ?묒뾽?먮쭔)
-- =====================================================
-- Zone 1 ?묒뾽??(1~12): 6紐?異쒓렐 (?곸쓬 - ?대룞 ??곸씠 ?꾩슂)
INSERT INTO work_logs (worker_id, started_at, planned_end_at)
SELECT
  user_id,
  DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR) AS started_at,
  DATE_ADD(DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR), INTERVAL 8 HOUR) AS planned_end_at
FROM users
WHERE user_id BETWEEN 1 AND 6 AND role = 'WORKER';

-- Zone 2 ?묒뾽??(13~24): 8紐?異쒓렐
INSERT INTO work_logs (worker_id, started_at, planned_end_at)
SELECT
  user_id,
  DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR) AS started_at,
  DATE_ADD(DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR), INTERVAL 8 HOUR) AS planned_end_at
FROM users
WHERE user_id BETWEEN 13 AND 20 AND role = 'WORKER';

-- Zone 3 ?묒뾽??(25~36): 10紐?異쒓렐
INSERT INTO work_logs (worker_id, started_at, planned_end_at)
SELECT
  user_id,
  DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR) AS started_at,
  DATE_ADD(DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR), INTERVAL 8 HOUR) AS planned_end_at
FROM users
WHERE user_id BETWEEN 25 AND 34 AND role = 'WORKER';

-- Zone 4 ?묒뾽??(37~47): 11紐?異쒓렐 (留롮쓬 - ?대룞 異쒕컻吏)
INSERT INTO work_logs (worker_id, started_at, planned_end_at)
SELECT
  user_id,
  DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR) AS started_at,
  DATE_ADD(DATE_SUB(NOW(), INTERVAL FLOOR(2 + RAND() * 3) HOUR), INTERVAL 8 HOUR) AS planned_end_at
FROM users
WHERE user_id BETWEEN 37 AND 47 AND role = 'WORKER';

-- =====================================================
-- 4. WORK_LOG_EVENTS (洹쇰Т ?대깽??
-- =====================================================
INSERT INTO work_log_events (work_log_id, event_type, occurred_at)
SELECT work_log_id, 'START', started_at
FROM work_logs;

-- ?쇰? ?묒뾽?먮뒗 ?쇱떆?뺤?/?ш컻 ?대깽??異붽?
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
-- 5. ZONE_ASSIGNMENTS (援ъ뿭 諛곗젙 ?대젰)
-- =====================================================
-- ?꾩옱 ?쒖꽦 ?묒뾽?먮뱾?????zone 諛곗젙
INSERT INTO zone_assignments (worker_id, zone_id, started_at)
SELECT
  wl.worker_id,
  u.assigned_zone_id,
  wl.started_at
FROM work_logs wl
JOIN users u ON wl.worker_id = u.user_id
WHERE wl.ended_at IS NULL;

-- =====================================================
-- 6. BATCH_TASKS (?묒뾽 ?좊떦)
-- =====================================================
-- Zone 1: 30媛??묒뾽 (?꾨즺 10, 吏꾪뻾 10, ?湲?10) - 二쇱쓽
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

-- Zone 2: 25媛??묒뾽 (?꾨즺 15, 吏꾪뻾 7, ?湲?3) - ?묓샇
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

-- Zone 3: 40媛??묒뾽 (?꾨즺 20, 吏꾪뻾 13, ?湲?7) - ?묓샇
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

-- Zone 4: 20媛??묒뾽 (?꾨즺 18, 吏꾪뻾 2, ?湲?0) - 嫄곗쓽 ?꾨즺
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
-- 7. BATCH_TASK_ITEMS (?묒뾽 ?꾩씠??
-- =====================================================
-- 媛?task留덈떎 2~5媛쒖쓽 ?곹뭹 ?좊떦
-- Zone 1 ?쒗뭹 ?ъ슜 (product_id: 101~105)
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

-- Zone 2 ?쒗뭹 ?ъ슜 (product_id: 201~205)
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
  (73 + FLOOR(RAND() * 72)) AS location_id, -- zone 2??location_id
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

-- Zone 3 ?쒗뭹 ?ъ슜 (product_id: 301~305)
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
  (145 + FLOOR(RAND() * 72)) AS location_id, -- zone 3??location_id
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

-- Zone 4 ?쒗뭹 ?ъ슜 (product_id: 401~405)
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
  (217 + FLOOR(RAND() * 72)) AS location_id, -- zone 4??location_id
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

-- picked_qty媛 required_qty瑜?珥덇낵?섏? ?딅룄濡??섏젙
UPDATE batch_task_items
SET picked_qty = required_qty
WHERE picked_qty > required_qty;

-- COMPLETED task??紐⑤뱺 ?꾩씠?쒖? DONE?쇰줈
UPDATE batch_task_items bti
JOIN batch_tasks bt ON bti.batch_task_id = bt.batch_task_id
SET bti.status = 'DONE', bti.picked_qty = bti.required_qty
WHERE bt.status = 'COMPLETED';

-- last_scanned_at ?낅뜲?댄듃 (DONE ?곹깭???꾩씠?쒖? ?ㅻ뒛 ?ㅼ틪??
UPDATE batch_task_items bti
JOIN batch_tasks bt ON bti.batch_task_id = bt.batch_task_id
SET bti.last_scanned_at = NOW()
WHERE bti.status = 'DONE';

-- =====================================================
-- 8. REBALANCE_SNAPSHOTS (AI ?щ같移??ㅻ깄???곗씠??
-- =====================================================
-- Use a single snapshot timestamp across all zones to ensure latest batch selection returns all rows.
SET @snap_ts = NOW();
-- Zone 1: 二쇱쓽 (risk媛 ?ш쾶 ?섏삤?꾨줉 backlog?? speed?? deadline??
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
  u.user_id as worker_id,
  1 as zone_id,
  0.10 as progress,
  500 as remaining_qty,
  1200 as time_to_planned_end_min,
  120 as time_to_deadline_min,  -- 留덇컧源뚯? 2?쒓컙 = 120遺?
  3000 as zone_backlog,
  10 as zone_active_workers,
  72 as zone_location_cnt,
  0 as zone_blocking_issue_cnt,
  1 as worker_speed_30m_avg,
  1 as speed_label,
  0 as picked_total,
  500 as required_total
FROM users u
WHERE u.role = 'WORKER' AND u.assigned_zone_id = 1;

-- Zone 2: ?묓샇 (ETA媛 deadline-60~deadline ?ъ씠)
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
  u.user_id as worker_id,
  2 as zone_id,
  0.60 as progress,
  15 as remaining_qty,
  180 as time_to_planned_end_min,
  240 as time_to_deadline_min,  -- 留덇컧源뚯? 4?쒓컙 = 240遺?
  200 as zone_backlog,
  12 as zone_active_workers,
  72 as zone_location_cnt,
  0 as zone_blocking_issue_cnt,
  60 as worker_speed_30m_avg,
  60 as speed_label,
  10 as picked_total,
  25 as required_total
FROM users u
WHERE u.role = 'WORKER' AND u.assigned_zone_id = 2;

-- Zone 3: ?묓샇 (ETA媛 deadline-60~deadline ?ъ씠)
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
  u.user_id as worker_id,
  3 as zone_id,
  0.50 as progress,
  15 as remaining_qty,
  180 as time_to_planned_end_min,
  240 as time_to_deadline_min,  -- 留덇컧源뚯? 4?쒓컙 = 240遺?
  200 as zone_backlog,
  12 as zone_active_workers,
  72 as zone_location_cnt,
  0 as zone_blocking_issue_cnt,
  60 as worker_speed_30m_avg,
  60 as speed_label,
  10 as picked_total,
  25 as required_total
FROM users u
WHERE u.role = 'WORKER' AND u.assigned_zone_id = 3;

-- Zone 4: ?덉젙 (ETA媛 deadline-60 ?대궡)
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
  u.user_id as worker_id,
  4 as zone_id,
  0.90 as progress,
  5 as remaining_qty,
  60 as time_to_planned_end_min,
  240 as time_to_deadline_min,  -- 留덇컧源뚯? 4?쒓컙 = 240遺?
  120 as zone_backlog,
  13 as zone_active_workers,
  72 as zone_location_cnt,
  0 as zone_blocking_issue_cnt,
  60 as worker_speed_30m_avg,
  60 as speed_label,
  10 as picked_total,
  15 as required_total
FROM users u
WHERE u.role = 'WORKER' AND u.assigned_zone_id = 4;

-- =====================================================
-- 9. ISSUES (?쇰? ?댁뒋 ?곗씠??- OPEN ?곹깭)
-- =====================================================
-- Zone 1?먯꽌 2嫄댁쓽 ?댁뒋
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
  'Damaged package' AS note,
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
  'Out of stock' AS note,
  DATE_SUB(NOW(), INTERVAL 15 MINUTE)
FROM batch_tasks bt
JOIN batch_task_items bti ON bt.batch_task_id = bti.batch_task_id
WHERE bt.zone_id = 1 AND bt.status = 'IN_PROGRESS'
LIMIT 1 OFFSET 1;

-- Zone 3?먯꽌 3嫄댁쓽 ?댁뒋 (媛??諛붿걶 援ъ뿭)
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
  'Damaged item' AS note,
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
  'Short picked' AS note,
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
  'Out of stock' AS note,
  DATE_SUB(NOW(), INTERVAL 10 MINUTE)
FROM batch_tasks bt
JOIN batch_task_items bti ON bt.batch_task_id = bti.batch_task_id
WHERE bt.zone_id = 3 AND bt.status = 'IN_PROGRESS'
LIMIT 1 OFFSET 2;

-- =====================================================
-- 9. ?몃쾭 ?곗씠??蹂댁젙 (IN_PROGRESS + current_location_id)
-- =====================================================
-- 9-0) 紐⑤뱺 ?묒뾽??異쒓렐 泥섎━ (?몃쾭 議곌굔 異⑹”)
-- 9-0a) 紐⑤뱺 WORKER??洹쇰Т 濡쒓렇瑜?異쒓렐 ?곹깭濡?媛뺤젣 (ended_at = NULL)
UPDATE work_logs wl
JOIN users u ON u.user_id = wl.worker_id
SET wl.ended_at = NULL
WHERE u.role = 'WORKER';

-- 9-0a-1) WORKER 諛곗젙 zone ?뺥빀??媛뺤젣 (id 踰붿쐞 湲곗?)
UPDATE users
SET assigned_zone_id = CASE
  WHEN user_id BETWEEN 1 AND 10 THEN 1   -- zone1: 10紐?(理쒖냼)
  WHEN user_id BETWEEN 11 AND 22 THEN 2  -- zone2: 12紐?(以묎컙)
  WHEN user_id BETWEEN 23 AND 34 THEN 3  -- zone3: 12紐?(以묎컙)
  WHEN user_id BETWEEN 35 AND 47 THEN 4  -- zone4: 13紐?(理쒕?)
  ELSE assigned_zone_id
END
WHERE role = 'WORKER';

-- 9-0b) 洹쇰Т 濡쒓렇媛 ?녿뒗 WORKER???좉퇋 異쒓렐 濡쒓렇 ?앹꽦
INSERT INTO work_logs (
  worker_id,
  started_at,
  planned_end_at
)
SELECT
  u.user_id,
  NOW() AS started_at,
  DATE_ADD(NOW(), INTERVAL 8 HOUR) AS planned_end_at
FROM users u
LEFT JOIN work_logs wl
  ON wl.worker_id = u.user_id AND wl.ended_at IS NULL
WHERE u.role = 'WORKER'
  AND wl.work_log_id IS NULL;

-- (?좏깮) 異쒓렐 ?대깽??湲곕줉
INSERT INTO work_log_events (work_log_id, event_type, occurred_at)
SELECT wl.work_log_id, 'START', wl.started_at
FROM work_logs wl
LEFT JOIN work_log_events we
  ON we.work_log_id = wl.work_log_id AND we.event_type = 'START'
WHERE wl.ended_at IS NULL
  AND we.event_id IS NULL;

-- 9-1) 異쒓렐 以묒씠吏留?IN_PROGRESS ?묒뾽???녿뒗 ?묒뾽?먯뿉寃??묒뾽 ?좊떦
WITH active_workers AS (
  SELECT
    u.user_id,
    u.assigned_zone_id,
    ROW_NUMBER() OVER (PARTITION BY u.assigned_zone_id ORDER BY u.user_id) AS rn
  FROM users u
  JOIN work_logs wl ON wl.worker_id = u.user_id AND wl.ended_at IS NULL
  LEFT JOIN batch_tasks bt
    ON bt.worker_id = u.user_id AND bt.status = 'IN_PROGRESS'
  WHERE u.role = 'WORKER'
    AND bt.batch_task_id IS NULL
),
unassigned_tasks AS (
  SELECT
    bt.batch_task_id,
    bt.zone_id,
    ROW_NUMBER() OVER (PARTITION BY bt.zone_id ORDER BY bt.batch_task_id) AS rn
  FROM batch_tasks bt
  WHERE bt.status = 'UNASSIGNED'
),
matched AS (
  SELECT
    aw.user_id,
    ut.batch_task_id
  FROM active_workers aw
  JOIN unassigned_tasks ut
    ON aw.assigned_zone_id = ut.zone_id
   AND aw.rn = ut.rn
)
UPDATE batch_tasks bt
JOIN matched m ON m.batch_task_id = bt.batch_task_id
SET
  bt.worker_id = m.user_id,
  bt.status = 'IN_PROGRESS',
  bt.action_status = 'SCAN_TOTE',
  bt.started_at = NOW();

-- 9-1b) 洹몃옒???⑥? ?묒뾽??諛곗젙??UNASSIGNED媛 遺議깊븳 寃쎌슦)瑜??꾪빐 ?묒뾽 ?앹꽦
INSERT INTO batch_tasks (
  batch_id,
  zone_id,
  worker_id,
  status,
  action_status,
  started_at
)
SELECT
  (SELECT b.batch_id FROM batches b WHERE b.status = 'IN_PROGRESS' ORDER BY b.deadline_at LIMIT 1),
  u.assigned_zone_id,
  u.user_id,
  'IN_PROGRESS',
  'SCAN_TOTE',
  NOW()
FROM users u
JOIN work_logs wl ON wl.worker_id = u.user_id AND wl.ended_at IS NULL
LEFT JOIN batch_tasks bt
  ON bt.worker_id = u.user_id AND bt.status = 'IN_PROGRESS'
WHERE u.role = 'WORKER'
  AND bt.batch_task_id IS NULL;

-- 9-1c) ?묒뾽?먮떦 IN_PROGRESS ?묒뾽 1媛쒕쭔 ?좎? (?섎㉧吏??UNASSIGNED濡??섎룎由?
UPDATE batch_tasks bt
JOIN (
  SELECT worker_id, MAX(batch_task_id) AS keep_task_id
  FROM batch_tasks
  WHERE status = 'IN_PROGRESS' AND worker_id IS NOT NULL
  GROUP BY worker_id
  HAVING COUNT(*) > 1
) k ON k.worker_id = bt.worker_id
SET
  bt.status = 'UNASSIGNED',
  bt.worker_id = NULL,
  bt.action_status = 'SCAN_TOTE',
  bt.started_at = NULL,
  bt.current_location_id = NULL,
  bt.location_scanned_at = NULL
WHERE bt.status = 'IN_PROGRESS'
  AND bt.batch_task_id <> k.keep_task_id;

-- 9-1d) 紐⑤뱺 WORKER媛 ?먯떊??zone??IN_PROGRESS ?묒뾽??媛뽯룄濡?蹂댁옣
INSERT INTO batch_tasks (
  batch_id,
  zone_id,
  worker_id,
  status,
  action_status,
  started_at
)
SELECT
  (SELECT b.batch_id FROM batches b WHERE b.status = 'IN_PROGRESS' ORDER BY b.deadline_at LIMIT 1),
  u.assigned_zone_id,
  u.user_id,
  'IN_PROGRESS',
  'SCAN_TOTE',
  NOW()
FROM users u
JOIN work_logs wl ON wl.worker_id = u.user_id AND wl.ended_at IS NULL
LEFT JOIN batch_tasks bt
  ON bt.worker_id = u.user_id
 AND bt.status = 'IN_PROGRESS'
 AND bt.zone_id = u.assigned_zone_id
WHERE u.role = 'WORKER'
  AND bt.batch_task_id IS NULL;

-- 9-2) IN_PROGRESS ?묒뾽 以?吏踰덉씠 ?녿뒗 寃쎌슦 ?쒕뜡 吏踰?遺??
UPDATE batch_tasks bt
JOIN users u ON u.user_id = bt.worker_id
SET
  bt.current_location_id = (
    SELECT zl.location_id
    FROM zone_locations zl
    WHERE zl.zone_id = COALESCE(bt.zone_id, u.assigned_zone_id)
      AND zl.is_active = 1
    ORDER BY RAND()
    LIMIT 1
  ),
  bt.location_scanned_at = NOW()
WHERE bt.status = 'IN_PROGRESS'
  AND bt.worker_id IS NOT NULL
  AND bt.current_location_id IS NULL;

-- 9-2b) batch_tasks.zone_id 湲곗??쇰줈 current_location_id 媛뺤젣 ?щ같??
UPDATE batch_tasks bt
SET
  bt.current_location_id = (
    SELECT zl.location_id
    FROM zone_locations zl
    WHERE zl.zone_id = bt.zone_id
      AND zl.is_active = 1
    ORDER BY RAND()
    LIMIT 1
  ),
  bt.location_scanned_at = NOW()
WHERE bt.status = 'IN_PROGRESS'
  AND bt.zone_id IS NOT NULL;

-- 9-3) ?묒뾽??諛곗젙 zone怨??묒뾽 zone ?숆린??(愿?쒕㏊ ?꾪꽣 ?쇱튂 蹂댁옣)
UPDATE batch_tasks bt
JOIN users u ON u.user_id = bt.worker_id
SET bt.zone_id = u.assigned_zone_id
WHERE bt.status = 'IN_PROGRESS'
  AND bt.worker_id IS NOT NULL
  AND (bt.zone_id IS NULL OR bt.zone_id <> u.assigned_zone_id);

-- 9-4) ?숆린????吏踰덉쓣 ?ㅼ떆 蹂댁젙 (zone_id 蹂寃?諛섏쁺)
UPDATE batch_tasks bt
JOIN users u ON u.user_id = bt.worker_id
SET
  bt.current_location_id = (
    SELECT zl.location_id
    FROM zone_locations zl
    WHERE zl.zone_id = u.assigned_zone_id
      AND zl.is_active = 1
    ORDER BY RAND()
    LIMIT 1
  ),
  bt.location_scanned_at = NOW()
WHERE bt.status = 'IN_PROGRESS'
  AND bt.worker_id IS NOT NULL
  AND bt.current_location_id IS NOT NULL;

-- 9-5) ?몃쾭 蹂댁옣: ?묒뾽?먮퀎 IN_PROGRESS + current_location_id 理쒖쥌 蹂댁젙
-- (?묒뾽???녾굅??吏踰덉씠 ?녿뒗 ?묒뾽?먭? ?⑥븘?덉? ?딅룄濡?留덉?留됱쑝濡?蹂댁젙)
UPDATE batch_tasks bt
JOIN users u ON u.user_id = bt.worker_id
SET
  bt.zone_id = u.assigned_zone_id,
  bt.current_location_id = (
    SELECT zl.location_id
    FROM zone_locations zl
    WHERE zl.zone_id = u.assigned_zone_id
      AND zl.is_active = 1
    ORDER BY RAND()
    LIMIT 1
  ),
  bt.location_scanned_at = NOW()
WHERE bt.status = 'IN_PROGRESS'
  AND bt.worker_id IS NOT NULL
  AND (bt.current_location_id IS NULL OR bt.zone_id <> u.assigned_zone_id);

-- 9-6) 諛곗튂 誘명븷???묒뾽?먯뿉寃??묒뾽 ?좊떦 + zone 吏踰?媛뺤젣 吏??
-- (紐⑤뱺 WORKER媛 IN_PROGRESS ?묒뾽 + current_location_id 蹂댁쑀?섎룄濡?
INSERT INTO batch_tasks (
  batch_id,
  zone_id,
  worker_id,
  status,
  action_status,
  started_at
)
SELECT
  (SELECT b.batch_id FROM batches b WHERE b.status = 'IN_PROGRESS' ORDER BY b.deadline_at LIMIT 1),
  u.assigned_zone_id,
  u.user_id,
  'IN_PROGRESS',
  'SCAN_TOTE',
  NOW()
FROM users u
JOIN work_logs wl ON wl.worker_id = u.user_id AND wl.ended_at IS NULL
LEFT JOIN batch_tasks bt
  ON bt.worker_id = u.user_id AND bt.status = 'IN_PROGRESS'
WHERE u.role = 'WORKER'
  AND bt.batch_task_id IS NULL;

UPDATE batch_tasks bt
JOIN users u ON u.user_id = bt.worker_id
SET
  bt.zone_id = u.assigned_zone_id,
  bt.current_location_id = (
    SELECT zl.location_id
    FROM zone_locations zl
    WHERE zl.zone_id = u.assigned_zone_id
      AND zl.is_active = 1
    ORDER BY RAND()
    LIMIT 1
  ),
  bt.location_scanned_at = NOW()
WHERE bt.status = 'IN_PROGRESS'
  AND bt.worker_id IS NOT NULL;

-- -- =====================================================
-- -- 10. ?곗씠??寃利?荑쇰━
-- -- =====================================================
-- SELECT '=== 援ъ뿭蹂??묒뾽 ?꾪솴 ===' AS info;
-- SELECT
--   z.zone_id,
--   COUNT(DISTINCT CASE WHEN wl.ended_at IS NULL THEN bt.worker_id END) AS active_workers,
--   COUNT(CASE WHEN bt.status = 'UNASSIGNED' THEN 1 END) AS unassigned_tasks,
--   COUNT(CASE WHEN bt.status = 'IN_PROGRESS' THEN 1 END) AS in_progress_tasks,
--   COUNT(CASE WHEN bt.status = 'COMPLETED' THEN 1 END) AS completed_tasks,
--   COUNT(bt.batch_task_id) AS total_tasks,
--   ROUND(COUNT(CASE WHEN bt.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(bt.batch_task_id), 2) AS completion_rate
-- FROM zones z
-- LEFT JOIN batch_tasks bt ON z.zone_id = bt.zone_id
-- LEFT JOIN work_logs wl ON bt.worker_id = wl.worker_id AND wl.ended_at IS NULL
-- GROUP BY z.zone_id
-- ORDER BY z.zone_id;

-- -- SELECT '=== ?댁뒋 ?꾪솴 ===' AS info;
-- -- SELECT
-- --   zone_id,
-- --   issue_type,
-- --   urgency,
-- --   COUNT(*) AS issue_count
-- -- FROM issues i
-- -- JOIN batch_tasks bt ON i.batch_task_id = bt.batch_task_id
-- -- WHERE i.status = 'OPEN'
-- -- GROUP BY zone_id, issue_type, urgency
-- -- ORDER BY zone_id, urgency;

-- SELECT '=== ?묒뾽?먮퀎 ?묒뾽??(IN_PROGRESS) ===' AS info;
-- SELECT
--   bt.worker_id,
--   u.name,
--   bt.zone_id,
--   COUNT(*) AS task_count,
--   SUM(CASE WHEN bt.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
--   SUM(CASE WHEN bt.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress,
--   SUM(CASE WHEN bt.status = 'UNASSIGNED' THEN 1 ELSE 0 END) AS unassigned
-- FROM batch_tasks bt
-- JOIN users u ON bt.worker_id = u.user_id
-- GROUP BY bt.worker_id, u.name, bt.zone_id
-- HAVING in_progress > 0
-- ORDER BY bt.zone_id, task_count DESC;

-- SELECT '=== ?곗씠???앹꽦 ?꾨즺 ===' AS result;


-- seed marker

INSERT INTO users (role, password_hash, name, phone_number, email, birth_date, is_active, created_at, updated_at) 
VALUES ('ADMIN', '', 'SuperAdmin', '01012341234', 'admin@lookie.com', '1990-01-01', TRUE, NOW(), NOW());
