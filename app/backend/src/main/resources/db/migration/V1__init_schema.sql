-- =========================
-- 1) users
-- =========================
-- 작업자(WORKER) / 관리자(ADMIN) 계정을 통합 관리하는 사용자 테이블
-- 인증, 권한(RBAC), 이슈/작업/통화 등 모든 행위의 주체
CREATE TABLE users (
  user_id BIGINT AUTO_INCREMENT PRIMARY KEY, -- 내부 사용자 PK
  role ENUM('ADMIN','WORKER') NOT NULL DEFAULT 'WORKER', -- 역할 구분 (RBAC)
  password_hash VARCHAR(255) NOT NULL, -- 암호화된 비밀번호
  name VARCHAR(255) NOT NULL, -- 사용자 실명
  phone_number VARCHAR(20) NOT NULL, -- 로그인 및 식별용 전화번호
  email VARCHAR(255) NULL, -- 비밀번호 찾기/알림용 이메일
  birth_date DATE NULL, -- 선택 정보
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- 계정 활성 여부 (소프트 삭제)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 생성 시각
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP, -- 수정 시각
  UNIQUE KEY uk_users_phone_number (phone_number), -- 전화번호 중복 방지
  UNIQUE KEY uk_users_email (email) -- 이메일 중복 방지
) ENGINE=InnoDB;

-- =========================
-- 2) batches
-- =========================
-- 물류 배치 단위 (출고 회차 개념)
-- 여러 batch_task를 묶는 최상위 작업 그룹
CREATE TABLE batches (
  batch_id BIGINT AUTO_INCREMENT PRIMARY KEY, -- 배치 PK
  batch_round INT NOT NULL, -- 회차 번호 (ex. 1차, 2차 출고)
  started_at DATETIME NULL, -- 배치 실제 시작 시각
  completed_at DATETIME NULL, -- 배치 완료 시각
  deadline_at DATETIME NOT NULL, -- 마감 시간 (SLA 기준)
  status ENUM('IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'IN_PROGRESS', -- 배치 상태
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 생성 시각
  KEY idx_batches_round (batch_round),
  KEY idx_batches_status (status),
  KEY idx_batches_deadline (deadline_at)
) ENGINE=InnoDB;

-- =========================
-- 3) batch_tasks
-- =========================
-- 배치 내 개별 작업 단위
-- 작업자에게 할당되는 실제 집품 작업
CREATE TABLE batch_tasks (
  batch_task_id BIGINT AUTO_INCREMENT PRIMARY KEY, -- 작업 PK
  batch_id BIGINT NOT NULL, -- 소속 배치
  worker_id BIGINT NULL, -- 할당된 작업자 (미할당 가능)
  status ENUM('UNASSIGNED','IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'UNASSIGNED', -- 작업 상태
  started_at DATETIME NULL, -- 작업 시작 시각
  completed_at DATETIME NULL, -- 작업 완료 시각
  tote_id BIGINT NULL, -- 사용 중인 토트
  tote_scanned_at DATETIME NULL, -- 토트 최초 스캔 시각
  tote_released_at DATETIME NULL, -- 토트 반납 시각
  CONSTRAINT fk_batch_tasks_batch
    FOREIGN KEY (batch_id) REFERENCES batches(batch_id),
  CONSTRAINT fk_batch_tasks_worker
    FOREIGN KEY (worker_id) REFERENCES users(user_id),
  KEY idx_batch_tasks_batch_id (batch_id),
  KEY idx_batch_tasks_worker_id (worker_id),
  KEY idx_batch_tasks_status (status),
  KEY idx_batch_tasks_tote_id (tote_id)
) ENGINE=InnoDB;

-- =========================
-- 4) totes
-- =========================
-- 물류 현장에서 사용하는 토트(Box)
-- 동시성 제어 및 작업 단위 식별의 핵심 리소스
CREATE TABLE totes (
  tote_id BIGINT PRIMARY KEY, -- 토트 고유 ID (바코드 기반)
  current_batch_task_id BIGINT NULL, -- 현재 연결된 작업
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- 사용 가능 여부
  CONSTRAINT fk_totes_current_task
    FOREIGN KEY (current_batch_task_id)
    REFERENCES batch_tasks(batch_task_id),
  KEY idx_totes_current_task (current_batch_task_id),
  KEY idx_totes_active (is_active)
) ENGINE=InnoDB;

-- =========================
-- 5) products
-- =========================
-- 상품 마스터 정보
-- 집품 대상의 기준 데이터
CREATE TABLE products (
  product_id BIGINT PRIMARY KEY, -- 상품 PK
  barcode VARCHAR(50) NOT NULL, -- 상품 바코드
  product_name VARCHAR(255) NOT NULL, -- 상품명
  product_image VARCHAR(255) NULL, -- 상품 이미지 URL
  location_id BIGINT NULL, -- 기본 적치 위치
  zone_id BIGINT NULL, -- 기본 소속 구역
  UNIQUE KEY uk_products_barcode (barcode), -- 바코드 유니크
  KEY idx_products_zone (zone_id),
  KEY idx_products_default_zone_location (location_id)
) ENGINE=InnoDB;

-- =========================
-- 6) batch_task_items
-- =========================
-- 작업 단위 내 개별 상품 집품 항목
-- 스캔/정합성/이슈 발생의 최소 단위
CREATE TABLE batch_task_items (
  batch_task_item_id BIGINT AUTO_INCREMENT PRIMARY KEY, -- 작업 아이템 PK
  batch_task_id BIGINT NOT NULL, -- 소속 작업
  product_id BIGINT NOT NULL, -- 상품
  location_id BIGINT NOT NULL, -- 실제 집품 위치
  required_qty INT NOT NULL DEFAULT 0, -- 요구 수량
  picked_qty INT NOT NULL DEFAULT 0, -- 실제 집품 수량
  status ENUM('PENDING','DONE','ISSUE') NOT NULL DEFAULT 'PENDING', -- 집품 상태
  completed_at DATETIME NULL, -- 완료 시각
  last_scanned_at DATETIME NULL, -- 마지막 스캔 시각
  CONSTRAINT fk_task_items_task
    FOREIGN KEY (batch_task_id) REFERENCES batch_tasks(batch_task_id),
  CONSTRAINT fk_task_items_product
    FOREIGN KEY (product_id) REFERENCES products(product_id),
  KEY idx_task_items_task (batch_task_id),
  KEY idx_task_items_status (status),
  KEY idx_task_items_last_scanned (last_scanned_at),
  KEY idx_task_items_zone_location (location_id)
) ENGINE=InnoDB;

-- =========================
-- 7) work_logs
-- =========================
-- 작업자 근무 세션 단위 로그
-- 출근 ~ 퇴근 기준
CREATE TABLE work_logs (
  work_log_id BIGINT AUTO_INCREMENT PRIMARY KEY, -- 근무 로그 PK
  worker_id BIGINT NOT NULL, -- 작업자
  started_at DATETIME NOT NULL, -- 출근 시각
  planned_end_at DATETIME NOT NULL, -- 예정 종료 시각
  ended_at DATETIME NULL, -- 실제 종료 시각
  CONSTRAINT fk_work_logs_worker
    FOREIGN KEY (worker_id) REFERENCES users(user_id),
  KEY idx_work_logs_worker (worker_id),
  KEY idx_work_logs_started (started_at),
  KEY idx_work_logs_active (worker_id, ended_at)
) ENGINE=InnoDB;

-- =========================
-- 8) work_log_events
-- =========================
-- 근무 중 상태 변화 이벤트 로그
-- START / PAUSE / RESUME / END 추적
CREATE TABLE work_log_events (
  event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  work_log_id BIGINT NOT NULL,
  event_type ENUM('START','PAUSE','RESUME','END') NOT NULL,
  reason VARCHAR(255) NULL, -- 일시정지 사유 등
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_work_log_events_log
    FOREIGN KEY (work_log_id) REFERENCES work_logs(work_log_id),
  KEY idx_work_log_events_log_time (work_log_id, occurred_at)
) ENGINE=InnoDB;

-- =========================
-- 9) zones
-- =========================
-- 물류 센터 내 구역 단위
-- 관제 및 배정의 기준
CREATE TABLE zones (
  zone_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  map_id BIGINT NULL, -- 소속 도면
  KEY idx_zones_map (map_id)
) ENGINE=InnoDB;

-- =========================
-- 10) zone_assignments
-- =========================
-- 작업자 ↔ 구역 배정 이력
-- AI/관리자 재배치 기록용
CREATE TABLE zone_assignments (
  assignment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  worker_id BIGINT NOT NULL,
  zone_id BIGINT NOT NULL,
  assignment_type ENUM('BASE','TEMP') NOT NULL DEFAULT 'BASE', -- 기본/임시 배정
  source ENUM('ADMIN','AI') NOT NULL DEFAULT 'ADMIN', -- 배정 주체
  assigned_by_admin_id BIGINT NULL, -- 관리자 배정 시
  started_at DATETIME NOT NULL, -- 배정 시작
  ended_at DATETIME NULL, -- 배정 종료
  reason VARCHAR(255) NULL, -- 배정 사유
  CONSTRAINT fk_zone_assign_worker
    FOREIGN KEY (worker_id) REFERENCES users(user_id),
  CONSTRAINT fk_zone_assign_zone
    FOREIGN KEY (zone_id) REFERENCES zones(zone_id),
  CONSTRAINT fk_zone_assign_admin
    FOREIGN KEY (assigned_by_admin_id) REFERENCES users(user_id),
  KEY idx_wza_worker (worker_id, started_at),
  KEY idx_wza_zone (zone_id, ended_at),
  KEY idx_wza_active (worker_id, ended_at)
) ENGINE=InnoDB;

-- =========================
-- 11) issues
-- =========================
-- 작업 중 발생한 예외/이슈 관리 테이블
-- AI 판정, 관리자 개입의 중심
CREATE TABLE issues (
  issue_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  issue_type ENUM('DAMAGED','OUT_OF_STOCK') NOT NULL, -- 이슈 유형
  status ENUM('OPEN','RESOLVED') NOT NULL DEFAULT 'OPEN', -- 처리 상태
  priority ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM', -- 긴급도
  reason_code ENUM(
    'DAMAGED','MOVE_LOCATION','WAITING_RETURN',
    'STOCK_EXISTS','UNKNOWN'
  ) NOT NULL DEFAULT 'UNKNOWN', -- 상세 원인 코드
  required_action ENUM(
    'WORKER_CONTINUE','ADMIN_REQUIRED',
    'WAIT_ADMIN','AUTO_RESOLVED'
  ) NOT NULL, -- 후속 액션
  worker_id BIGINT NOT NULL, -- 신고 작업자
  admin_id BIGINT NULL, -- 처리 관리자
  batch_task_id BIGINT NOT NULL, -- 연관 작업
  batch_task_item_id BIGINT NULL, -- 연관 상품
  zone_location_id BIGINT NULL, -- 발생 위치
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  note VARCHAR(255) NULL, -- 관리자 메모
  CONSTRAINT fk_issues_worker FOREIGN KEY (worker_id) REFERENCES users(user_id),
  CONSTRAINT fk_issues_admin FOREIGN KEY (admin_id) REFERENCES users(user_id),
  CONSTRAINT fk_issues_task FOREIGN KEY (batch_task_id) REFERENCES batch_tasks(batch_task_id),
  CONSTRAINT fk_issues_item FOREIGN KEY (batch_task_item_id) REFERENCES batch_task_items(batch_task_item_id),
  KEY idx_issues_status_created (status, created_at),
  KEY idx_issues_task_created (batch_task_id, created_at),
  KEY idx_issues_item_status (batch_task_item_id, status),
  KEY idx_issues_zone_location_created (zone_location_id, created_at)
) ENGINE=InnoDB;

-- =========================
-- 12) issue_images
-- =========================
-- 이슈 증빙 이미지
-- AI 판정 입력 데이터
CREATE TABLE issue_images (
  issue_image_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  issue_id BIGINT NOT NULL,
  image_url VARCHAR(255) NOT NULL, -- 이미지 저장 경로
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_issue_images_issue
    FOREIGN KEY (issue_id) REFERENCES issues(issue_id),
  KEY idx_issue_images_issue (issue_id, created_at)
) ENGINE=InnoDB;

-- =========================
-- 13) ai_judgments
-- =========================
-- AI 판정 결과 로그
-- 재촬영/관리자 호출 판단 근거
CREATE TABLE ai_judgments (
  judgment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  issue_id BIGINT NOT NULL,
  image_url VARCHAR(255) NULL, -- 분석 대상 이미지
  ai_result JSON NULL, -- 모델 원본 결과
  confidence DECIMAL(5,4) NULL, -- 신뢰도
  ai_decision ENUM('PASS','FAIL','RETAKE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN', -- 최종 판단
  summary TEXT NULL, -- 요약 설명
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ai_judgments_issue
    FOREIGN KEY (issue_id) REFERENCES issues(issue_id),
  KEY idx_ai_judgments_issue_time (issue_id, created_at)
) ENGINE=InnoDB;

-- =========================
-- 14) webrtc_calls
-- =========================
-- 관리자 ↔ 작업자 WebRTC 통화 세션
-- 이슈 대응용 실시간 커뮤니케이션
CREATE TABLE webrtc_calls (
  call_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  issue_id BIGINT NOT NULL,
  worker_id BIGINT NOT NULL,
  admin_id BIGINT NULL,
  session_key VARCHAR(255) NOT NULL, -- WebRTC 세션 식별자
  status ENUM('REQUESTED','CONNECTED','MISSED','ENDED') NOT NULL DEFAULT 'REQUESTED',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL,
  CONSTRAINT fk_webrtc_issue FOREIGN KEY (issue_id) REFERENCES issues(issue_id),
  CONSTRAINT fk_webrtc_worker FOREIGN KEY (worker_id) REFERENCES users(user_id),
  CONSTRAINT fk_webrtc_admin FOREIGN KEY (admin_id) REFERENCES users(user_id),
  UNIQUE KEY uk_webrtc_session_key (session_key),
  KEY idx_webrtc_issue (issue_id),
  KEY idx_webrtc_status_time (status, started_at)
) ENGINE=InnoDB;

-- =========================
-- 15) control_maps
-- =========================
-- 물류 센터 도면 정보
-- 관제 맵 시각화용
CREATE TABLE control_maps (
  map_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  map_name VARCHAR(50) NOT NULL, -- 도면 이름
  image_url VARCHAR(255) NOT NULL, -- 도면 이미지
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================
-- 16) map_zone_polygons
-- =========================
-- 도면 위 구역 다각형 좌표
-- 히트맵/관제 시각화
CREATE TABLE map_zone_polygons (
  polygon_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  map_id BIGINT NOT NULL,
  zone_id BIGINT NOT NULL,
  points_json JSON NOT NULL, -- polygon 좌표
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_polygons_map FOREIGN KEY (map_id) REFERENCES control_maps(map_id),
  CONSTRAINT fk_polygons_zone FOREIGN KEY (zone_id) REFERENCES zones(zone_id),
  KEY idx_polygons_map (map_id),
  KEY idx_polygons_zone (zone_id)
) ENGINE=InnoDB;

-- =========================
-- 17) zone_lines
-- =========================
-- 구역 내 라인 단위 (피킹 라인 등)
CREATE TABLE zone_lines (
  line_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  zone_id BIGINT NOT NULL,
  line_name VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_zone_lines_zone
    FOREIGN KEY (zone_id) REFERENCES zones(zone_id),
  KEY idx_zone_lines_zone (zone_id),
  KEY idx_zone_lines_active (is_active)
) ENGINE=InnoDB;

-- =========================
-- 18) zone_locations
-- =========================
-- 실제 집품 위치(지번)
-- 좌표 기반 관제 및 스캔 기준
CREATE TABLE zone_locations (
  location_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  map_id BIGINT NOT NULL,
  zone_id BIGINT NOT NULL,
  line_id BIGINT NULL,
  location_code VARCHAR(50) NOT NULL, -- 지번 코드
  x DECIMAL(8,5) NOT NULL, -- X 좌표
  y DECIMAL(8,5) NOT NULL, -- Y 좌표
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_zone_locations_map FOREIGN KEY (map_id) REFERENCES control_maps(map_id),
  CONSTRAINT fk_zone_locations_zone FOREIGN KEY (zone_id) REFERENCES zones(zone_id),
  CONSTRAINT fk_zone_locations_line FOREIGN KEY (line_id) REFERENCES zone_lines(line_id),
  UNIQUE KEY uk_zone_locations_scope (map_id, zone_id, location_code),
  KEY idx_zone_locations_zone (zone_id),
  KEY idx_zone_locations_line (line_id),
  KEY idx_zone_locations_active (is_active)
) ENGINE=InnoDB;

-- =========================
-- 19) admin_assignments
-- =========================
-- 관리자 ↔ 담당 구역 매핑
-- 관제 권한 범위 정의용 (이력 X, 현재 상태만)
CREATE TABLE admin_assignments (
  admin_id BIGINT NOT NULL,
  zone_id BIGINT NOT NULL,
  PRIMARY KEY (admin_id, zone_id),
  CONSTRAINT fk_admin_assign_admin
    FOREIGN KEY (admin_id) REFERENCES users(user_id),
  CONSTRAINT fk_admin_assign_zone
    FOREIGN KEY (zone_id) REFERENCES zones(zone_id)
) ENGINE=InnoDB;
