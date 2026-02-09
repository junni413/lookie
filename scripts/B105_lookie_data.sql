-- 1. 기존 데이터 정리 (FK 순서 고려)
use lookie;

select * from users;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE ai_judgments;
TRUNCATE TABLE issue_images;
TRUNCATE TABLE issues;
TRUNCATE TABLE batch_task_items;
TRUNCATE TABLE totes;
TRUNCATE TABLE batch_tasks;
TRUNCATE TABLE batches;
TRUNCATE TABLE inventory_current;
TRUNCATE TABLE inventory_events;
TRUNCATE TABLE products;
TRUNCATE TABLE zone_locations;
TRUNCATE TABLE zone_lines;
TRUNCATE TABLE zone_assignments;
TRUNCATE TABLE admin_assignments;
TRUNCATE TABLE work_log_events;
TRUNCATE TABLE work_logs;
TRUNCATE TABLE users;
TRUNCATE TABLE zones;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. 구역(Zone) 및 지번(Location) 설정
INSERT INTO zones (zone_id) VALUES (1);
INSERT INTO zone_lines (line_id, zone_id, line_name) VALUES (1, 1, 'A라인');
INSERT INTO zone_locations (location_id, zone_id, line_id, location_code, x, y) VALUES 
(1, 1, 1, 'A-05-01', 10.0, 10.0),
(2, 1, 1, 'A-05-02', 20.0, 10.0),
(3, 1, 1, 'A-05-03', 30.0, 10.0),
(4, 1, 1, 'A-05-04', 40.0, 10.0);

-- 3. 사용자 및 할당 (Password: lookie123!)
-- 관리자: 유동훈 (ID 1)
INSERT INTO users (user_id, role, password_hash, name, phone_number, email, assigned_zone_id)
VALUES (1, 'ADMIN', '$2a$10$HmpEkgEeT7lHd2fBYWVrT.OTLue2CLprtR7o0qPsfBHDE6AAqQmbK', '유동훈', '01011111111', 'admin@lookie.com', 1);
INSERT INTO admin_assignments (admin_id, zone_id) VALUES (1, 1);

-- 작업자1: 김세현 (ID 2)
INSERT INTO users (user_id, role, password_hash, name, phone_number, email, assigned_zone_id)
VALUES (2, 'WORKER', '$2a$10$HmpEkgEeT7lHd2fBYWVrT.OTLue2CLprtR7o0qPsfBHDE6AAqQmbK', '김세현', '01022222222', 'worker1@lookie.com', 1);
INSERT INTO zone_assignments (worker_id, zone_id, assignment_type, source, started_at) VALUES (2, 1, 'BASE', 'ADMIN', NOW());

-- 작업자2: 여이지 (ID 3)
INSERT INTO users (user_id, role, password_hash, name, phone_number, email, assigned_zone_id)
VALUES (3, 'WORKER', '$2a$10$HmpEkgEeT7lHd2fBYWVrT.OTLue2CLprtR7o0qPsfBHDE6AAqQmbK', '여이지', '01033333333', 'worker2@lookie.com', 1);
INSERT INTO zone_assignments (worker_id, zone_id, assignment_type, source, started_at) VALUES (3, 1, 'BASE', 'ADMIN', NOW());

-- 4. 출근 처리 (Work Logs)
INSERT INTO work_logs (work_log_id, worker_id, started_at, planned_end_at) VALUES 
(1, 2, NOW(), DATE_ADD(NOW(), INTERVAL 8 HOUR)),
(2, 3, NOW(), DATE_ADD(NOW(), INTERVAL 8 HOUR));
INSERT INTO work_log_events (work_log_id, event_type, occurred_at) VALUES (1, 'START', NOW()), (2, 'START', NOW());

-- 5. 상품 및 재고
INSERT INTO products (product_id, barcode, product_name, location_id, zone_id, product_image) VALUES 
(1000, 'PROD-001', '눈을감자', 1, 1, 'https://i14b105.p.ssafy.io/images/potato.jpg'),
(1001, 'PROD-005', '바나나', 2, 1, 'https://i14b105.p.ssafy.io/images/banana.jpg'),
(1002, 'PROD-014', '홈런볼', 3, 1, 'https://i14b105.p.ssafy.io/images/homerunball.jpg'),
(1003, 'PROD-004', '오렌지', 4, 1, 'https://i14b105.p.ssafy.io/images/orange.jpg');

INSERT INTO inventory_current (product_id, location_id, available_qty) VALUES 
(1000, 1, 50), (1001, 2, 30), (1002, 3, 20), (1003, 4, 10);

-- 6. 배치 및 토트
INSERT INTO batches (batch_id, batch_round, deadline_at, status) VALUES (1, 1, DATE_ADD(NOW(), INTERVAL 2 HOUR), 'IN_PROGRESS');
INSERT INTO totes (tote_id, barcode, is_active) VALUES (1, 'TOTE-001', 1), (2, 'TOTE-002', 1);

-- 7. 작업 할당 (두 작업자 모두 할당 대기 상태로 설정)
-- 작업자 1 (김세현): 할당 대기, 토트 스캔 전
INSERT INTO batch_tasks (batch_task_id, batch_id, worker_id, status, zone_id, action_status, started_at, tote_id, tote_scanned_at)
VALUES (1, 1, 2, 'UNASSIGNED', 1, 'SCAN_TOTE', NULL, NULL, NULL);

-- 작업자 2 (여이지): 할당 대기, 토트 스캔 전
INSERT INTO batch_tasks (batch_task_id, batch_id, worker_id, status, zone_id, action_status, started_at, tote_id, tote_scanned_at)
VALUES (2, 1, 3, 'UNASSIGNED', 1, 'SCAN_TOTE', NULL, NULL, NULL);

-- 토트 상태 초기화 (어떤 작업에도 할당되지 않은 상태)
UPDATE totes SET current_batch_task_id = NULL;

-- 8. 세부 작업 아이템 (Task Items)
-- 작업자 1용 아이템
INSERT INTO batch_task_items (batch_task_item_id, batch_task_id, product_id, location_id, required_qty, picked_qty, status) VALUES 
(11, 1, 1000, 1, 2, 0, 'PENDING'),    -- 시나리오 1용 (정상)
(12, 1, 1001, 2, 1, 0, 'PENDING'),    -- 시나리오 3용 (재고없음-원복대기 예정)
(13, 1, 1002, 3, 5, 0, 'PENDING');    -- 다음 작업용

-- 작업자 2용 아이템
INSERT INTO batch_task_items (batch_task_item_id, batch_task_id, product_id, location_id, required_qty, picked_qty, status) VALUES 
(21, 2, 1000, 1, 1, 0, 'PENDING'),    -- 시나리오 2용 (파손 예정)
(22, 2, 1001, 2, 1, 0, 'PENDING'),    -- 시나리오 5용 (OOS-Ghost Stock 예정)
(23, 2, 1003, 4, 3, 0, 'PENDING');    -- 다음 작업용

-- 9. 메인 시나리오용 기생성 이슈 (테스트용)
-- [이슈 101] 작업자 1의 재고없음 (원복 대기) -> NON_BLOCKING, 관리자 사후확인 불필요
-- INSERT INTO issues (issue_id, issue_type, status, reason_code, worker_id, batch_task_id, batch_task_item_id, zone_location_id, urgency, issue_handling, admin_required, ai_decision)
-- VALUES (101, 'OUT_OF_STOCK', 'OPEN', 'WAITING_RETURN', 2, 1, 12, 2, 3, 'NON_BLOCKING', 0, 'PASS');
-- INSERT INTO ai_judgments (issue_id, ai_decision, confidence, summary)
-- VALUES (101, 'PASS', 0.95, '원복 대기 또는 파손 전수 조사 중인 상품으로 인해 일시적으로 재고가 없습니다.');

-- -- [이슈 102] 작업자 2의 파손 (관리자 확인용) -> 긴급도 2, 관리자 확인 필수
-- INSERT INTO issues (issue_id, issue_type, status, reason_code, worker_id, batch_task_id, batch_task_item_id, zone_location_id, urgency, issue_handling, admin_required, ai_decision)
-- VALUES (102, 'DAMAGED', 'OPEN', 'DAMAGED', 3, 2, 21, 1, 2, 'NON_BLOCKING', 1, 'FAIL');
-- INSERT INTO ai_judgments (issue_id, ai_decision, confidence, summary, image_url)
-- VALUES (102, 'FAIL', 0.88, '상품 패키지가 찢어져 내용물이 노출된 파손 상태가 확인되었습니다.', 'https://dummyimage.com/600x400/000/fff&text=Damaged+Product');
-- INSERT INTO issue_images (issue_id, image_url) VALUES (102, 'https://dummyimage.com/600x400/000/fff&text=Damaged+Product');

-- -- [이슈 103] 작업자 2의 재고없음 (Ghost Stock) -> BLOCKING, 관리자 연결 필수
-- INSERT INTO issues (issue_id, issue_type, status, reason_code, worker_id, batch_task_id, batch_task_item_id, zone_location_id, urgency, issue_handling, admin_required, ai_decision)
-- VALUES (103, 'OUT_OF_STOCK', 'OPEN', 'STOCK_EXISTS', 3, 2, 22, 2, 1, 'BLOCKING', 1, 'PASS');
-- INSERT INTO ai_judgments (issue_id, ai_decision, confidence, summary)
-- VALUES (103, 'PASS', 0.99, '전산상 재고가 30개 존재합니다. 작업 영역 내 실물 재고 확인을 위해 관리자 연결이 필요합니다.');

-- -- 이슈 생성에 따른 아이템 상태 업데이트
-- UPDATE batch_task_items SET status = 'ISSUE_PENDING' WHERE batch_task_item_id IN (12, 21, 22);