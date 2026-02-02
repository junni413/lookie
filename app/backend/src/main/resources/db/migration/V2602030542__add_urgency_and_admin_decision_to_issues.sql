-- Issue 정책 변경: urgency 및 admin_decision 필드 추가
-- 분기표(flow_chart.txt) 기준으로 관제 큐 우선순위 및 관리자 확정 결과 저장

-- 1. urgency 컬럼 추가 (관제 큐 우선순위, 0-5)
-- 기존 데이터 호환을 위해 NULL 허용으로 추가 후 기본값 설정
ALTER TABLE issues
ADD COLUMN urgency TINYINT NULL
COMMENT '관제 큐 우선순위 (0=큐 제외, 1=최상위, 5=최하위)';

-- 기존 데이터에 기본값 설정
UPDATE issues SET urgency = 3 WHERE urgency IS NULL;

-- NOT NULL 제약 조건 추가
ALTER TABLE issues
MODIFY COLUMN urgency TINYINT NOT NULL DEFAULT 3;

-- 2. admin_decision 컬럼 추가 (관리자 확정 결과)
ALTER TABLE issues
ADD COLUMN admin_decision ENUM(
  'NORMAL',              -- 정상 판정
  'DAMAGED',             -- 파손 확정
  'CALLED_OTHER_PROCESS',-- 다른 공정 호출
  'FIXED'                -- 전산 오류 수정 완료 (OUT_OF_STOCK)
) NULL
COMMENT '관리자 확정 결과 (ADMIN_CONFIRM 시 저장)';

-- 3. urgency 인덱스 추가 (관제 큐 조회 최적화)
CREATE INDEX idx_issues_urgency_status ON issues(urgency, status, created_at);
