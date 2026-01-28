-- ======================================================
-- 1) users
-- 사용자(관리자 / 작업자) 계정 테이블
-- ======================================================
CREATE TABLE users (
  user_id BIGINT AUTO_INCREMENT PRIMARY KEY,         -- 사용자 고유 ID
  role ENUM('ADMIN','WORKER') NOT NULL DEFAULT 'WORKER', -- 사용자 역할 (관리자/작업자)
  password_hash VARCHAR(255) NOT NULL,               -- 비밀번호 해시값
  name VARCHAR(255) NOT NULL,                         -- 사용자 이름
  phone_number VARCHAR(20) NOT NULL,                  -- 로그인 ID로 사용하는 전화번호
  email VARCHAR(255) NULL,                            -- 비밀번호 찾기용 이메일
  birth_date DATE NULL,                               -- 생년월일
  is_active BOOLEAN NOT NULL DEFAULT TRUE,             -- 계정 활성화 여부
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 계정 생성 시각
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,                      -- 계정 정보 수정 시각
  UNIQUE KEY uk_users_phone_number (phone_number),    -- 전화번호 중복 방지
  UNIQUE KEY uk_users_email (email)                   -- 이메일 중복 방지
) ENGINE=InnoDB;

-- ======================================================
-- 2) batches
-- 물류 배치(회차) 단위 테이블
-- ======================================================
CREATE TABLE batches (
  batch_id BIGINT AUTO_INCREMENT PRIMARY KEY,         -- 배치 고유 ID
  batch_round INT NOT NULL,                            -- 배치 회차 번호
  started_at DATETIME NULL,                            -- 배치 시작 시각
  completed_at DATETIME NULL,                          -- 배치 실제 종료 시각
  deadline_at DATETIME NOT NULL,                       -- 배치 마감 기한
  status ENUM('IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'IN_PROGRESS', -- 배치 상태
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 배치 생성 시각
  KEY idx_batches_round (batch_round),                 -- 회차 기준 조회
  KEY idx_batches_status (status),                     -- 진행중/완료 상태 필터
  KEY idx_batches_deadline (deadline_at)               -- 마감 기한 기준 정렬/조회
) ENGINE=InnoDB;

-- ======================================================
-- 3) batch_tasks
-- 배치 내 작업자 단위 작업 테이블
-- ======================================================
CREATE TABLE batch_tasks (
  batch_task_id BIGINT AUTO_INCREMENT PRIMARY KEY,    -- 배치 상세 작업 ID
  batch_id BIGINT NOT NULL,                            -- 상위 배치 ID
  worker_id BIGINT NULL,                               -- 할당된 작업자 (미할당 가능)
  status ENUM('UNASSIGNED','IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'UNASSIGNED', -- 작업 상태
  started_at DATETIME NULL,                            -- 작업 시작 시각
  completed_at DATETIME NULL,                          -- 작업 종료 시각
  tote_id BIGINT NULL,                                 -- 사용 중인 토트 ID
  tote_scanned_at DATETIME NULL,                       -- 토트 최초 스캔 시각
  tote_released_at DATETIME NULL,                      -- 토트 사용 종료 시각
  CONSTRAINT fk_batch_tasks_batch
    FOREIGN KEY (batch_id) REFERENCES batches(batch_id), -- 배치 소속 관계
  CONSTRAINT fk_batch_tasks_worker
    FOREIGN KEY (worker_id) REFERENCES users(user_id),   -- 작업자 참조
  KEY idx_batch_tasks_batch_id (batch_id),             -- 배치별 작업 조회
  KEY idx_batch_tasks_worker_id (worker_id),           -- 작업자 기준 조회
  KEY idx_batch_tasks_status (status),                 -- 작업 상태 필터
  KEY idx_batch_tasks_tote_id (tote_id)                -- 토트 사용 여부 조회
) ENGINE=InnoDB;

-- ======================================================
-- 4) totes
-- 센터 전체 토트 자산 관리 테이블
-- ======================================================
CREATE TABLE totes (
  tote_id BIGINT PRIMARY KEY,                          -- 토트 ID
  current_batch_task_id BIGINT NULL,                   -- 현재 연결된 작업 (캐시 용도)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,              -- 사용 가능 여부
  CONSTRAINT fk_totes_current_task
    FOREIGN KEY (current_batch_task_id)
    REFERENCES batch_tasks(batch_task_id),              -- 현재 사용 중인 작업 참조
  KEY idx_totes_current_task (current_batch_task_id),  -- 토트 사용 상태 조회
  KEY idx_totes_active (is_active)                     -- 사용 가능 토트 필터
) ENGINE=InnoDB;

-- ======================================================
-- 5) products
-- 상품 마스터 테이블
-- ======================================================
CREATE TABLE products (
  product_id BIGINT PRIMARY KEY,                       -- 상품 ID
  barcode VARCHAR(50) NOT NULL,                         -- 상품 바코드
  product_name VARCHAR(255) NOT NULL,                  -- 상품명
  product_image VARCHAR(255) NULL,                     -- 상품 이미지 URL
  location_id BIGINT NULL,                              -- 기본 지번 ID
  zone_id BIGINT NULL,                                  -- 기본 구역 ID
  UNIQUE KEY uk_products_barcode (barcode),            -- 바코드 중복 방지
  KEY idx_products_zone (zone_id),                     -- 구역 기준 조회
  KEY idx_products_default_zone_location (location_id) -- 지번 기준 조회
) ENGINE=InnoDB;

-- ======================================================
-- 6) batch_task_items
-- 배치 상세 작업에 포함된 상품 목록
-- ======================================================
CREATE TABLE batch_task_items (
  batch_task_item_id BIGINT AUTO_INCREMENT PRIMARY KEY, -- 배치 아이템 ID
  batch_task_id BIGINT NOT NULL,                         -- 소속 배치 작업
  product_id BIGINT NOT NULL,                            -- 상품 ID
  location_id BIGINT NOT NULL,                           -- 실제 작업 지번
  required_qty INT NOT NULL DEFAULT 0,                   -- 목표 수량
  picked_qty INT NOT NULL DEFAULT 0,                     -- 실제 집품 수량
  status ENUM('PENDING','DONE','ISSUE') NOT NULL DEFAULT 'PENDING', -- 작업 상태
  completed_at DATETIME NULL,                            -- 완료 시각
  last_scanned_at DATETIME NULL,                         -- 마지막 스캔 시각
  CONSTRAINT fk_task_items_task
    FOREIGN KEY (batch_task_id) REFERENCES batch_tasks(batch_task_id),
  CONSTRAINT fk_task_items_product
    FOREIGN KEY (product_id) REFERENCES products(product_id),
  KEY idx_task_items_task (batch_task_id),              -- 작업별 아이템 조회
  KEY idx_task_items_status (status),                   -- 상태 필터
  KEY idx_task_items_last_scanned (last_scanned_at),    -- 스캔 시간 기준 정렬
  KEY idx_task_items_zone_location (location_id)        -- 지번 기준 조회
) ENGINE=InnoDB;

-- ======================================================
-- 7) work_logs
-- 작업자 근무 이력 테이블
-- ======================================================
CREATE TABLE work_logs (
  work_log_id BIGINT AUTO_INCREMENT PRIMARY KEY,        -- 근무 기록 ID
  worker_id BIGINT NOT NULL,                             -- 작업자 ID
  started_at DATETIME NOT NULL,                          -- 출근 시각
  planned_end_at DATETIME NOT NULL,                      -- 예정 퇴근 시각
  ended_at DATETIME NULL,                                -- 실제 퇴근 시각
  CONSTRAINT fk_work_logs_worker
    FOREIGN KEY (worker_id) REFERENCES users(user_id),
  KEY idx_work_logs_worker (worker_id),                  -- 작업자별 근무 조회
  KEY idx_work_logs_started (started_at),                -- 근무 시작 기준 조회
  KEY idx_work_logs_active (worker_id, ended_at)         -- 현재 근무 중 여부 판단
) ENGINE=InnoDB;

-- ======================================================
-- 8) work_log_events
-- 근무 중 이벤트 로그 (시작/중단/재개/종료)
-- ======================================================
CREATE TABLE work_log_events (
  event_id BIGINT AUTO_INCREMENT PRIMARY KEY,           -- 이벤트 ID
  work_log_id BIGINT NOT NULL,                            -- 근무 기록 ID
  event_type ENUM('START','PAUSE','RESUME','END') NOT NULL, -- 이벤트 유형
  reason VARCHAR(255) NULL,                              -- 중단 사유 등
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 이벤트 발생 시각
  CONSTRAINT fk_work_log_events_log
    FOREIGN KEY (work_log_id) REFERENCES work_logs(work_log_id),
  KEY idx_work_log_events_log_time (work_log_id, occurred_at) -- 시간 순 이벤트 조회
) ENGINE=InnoDB;

-- ======================================================
-- 9) zones
-- 센터 내 작업 구역 마스터
-- ======================================================
CREATE TABLE zones (
  zone_id BIGINT AUTO_INCREMENT PRIMARY KEY,             -- 구역 ID
  map_id BIGINT NULL,                                    -- 관제 맵 ID
  KEY idx_zones_map (map_id)                             -- 맵 기준 구역 조회
) ENGINE=InnoDB;

-- ======================================================
-- 10) zone_assignments
-- 작업자 구역 배정 이력
-- ======================================================
CREATE TABLE zone_assignments (
  assignment_id BIGINT AUTO_INCREMENT PRIMARY KEY,       -- 배정 ID
  worker_id BIGINT NOT NULL,                              -- 작업자 ID
  zone_id BIGINT NOT NULL,                                -- 구역 ID
  assignment_type ENUM('BASE','TEMP') NOT NULL DEFAULT 'BASE', -- 기본/임시 배정
  source ENUM('ADMIN','AI') NOT NULL DEFAULT 'ADMIN',     -- 배정 주체
  assigned_by_admin_id BIGINT NULL,                       -- 수동 배정 관리자
  started_at DATETIME NOT NULL,                           -- 배정 시작
  ended_at DATETIME NULL,                                 -- 배정 종료
  reason VARCHAR(255) NULL,                               -- 배정 사유
  CONSTRAINT fk_zone_assign_worker
    FOREIGN KEY (worker_id) REFERENCES users(user_id),
  CONSTRAINT fk_zone_assign_zone
    FOREIGN KEY (zone_id) REFERENCES zones(zone_id),
  CONSTRAINT fk_zone_assign_admin
    FOREIGN KEY (assigned_by_admin_id) REFERENCES users(user_id),
  KEY idx_wza_worker (worker_id, started_at),             -- 작업자 기준 배정 이력
  KEY idx_wza_zone (zone_id, ended_at),                   -- 구역 기준 배정 이력
  KEY idx_wza_active (worker_id, ended_at)                -- 현재 활성 배정
) ENGINE=InnoDB;
