-- =====================================================
-- 새 FSM 스키마 적용 (260207 FSM 가이드 기준)
-- =====================================================

-- 1. batch_task_items 상태 ENUM 수정
-- 기존: PENDING, DONE, ISSUE, ISSUE_PENDING
-- 신규: PENDING, IN_PROGRESS, ISSUE_PENDING, DONE
ALTER TABLE batch_task_items 
MODIFY COLUMN status ENUM('PENDING', 'IN_PROGRESS', 'ISSUE_PENDING', 'DONE') 
NOT NULL DEFAULT 'PENDING'
COMMENT 'FSM 상태: PENDING(대기) → IN_PROGRESS(진행중) → DONE(완료), ISSUE_PENDING(이슈보류)';

-- 2. issues 테이블에 FSM 핵심 필드 추가 (ai_decision, webrtc_status)
ALTER TABLE issues 
ADD COLUMN ai_decision ENUM(
    'PASS',         -- AI 판정: 정상
    'FAIL',         -- AI 판정: 문제 확실
    'NEED_CHECK',   -- AI 판정: 애매함 (관리자 연결 필수)
    'RETAKE',       -- AI 판정: 재촬영 필요
    'UNKNOWN'       -- AI 판정 전 or 판정 실패
) NOT NULL DEFAULT 'UNKNOWN'
COMMENT 'AI 판정 결과 (FSM 가드용, ai_judgments 최신값 복사)',
ADD COLUMN webrtc_status ENUM(
    'NONE',         -- WebRTC 연결 시도 안 함
    'WAITING',      -- 관리자 연결 대기 중
    'CONNECTED',    -- 관리자 연결 완료
    'MISSED'        -- 관리자 부재 (연결 실패)
) NOT NULL DEFAULT 'NONE'
COMMENT 'WebRTC 연결 상태 (NEED_CHECK 정책: 연결 시도 필수, MISSED 후에만 작업자 NEXT 허용)';

-- 3. 인덱스 추가 (FSM 가드 조회 최적화)
CREATE INDEX idx_issues_ai_decision_webrtc 
ON issues(ai_decision, webrtc_status);

-- 4. LEGACY 컬럼 주석 변경 (FSM 판단에서 제외)
ALTER TABLE issues 
MODIFY COLUMN admin_required TINYINT(1) NOT NULL DEFAULT 0
COMMENT 'LEGACY: UI/DTO용 계산 필드, FSM 판단에 사용 금지 (ai_decision==NEED_CHECK로 대체)',
MODIFY COLUMN issue_handling ENUM('BLOCKING', 'NON_BLOCKING') NOT NULL DEFAULT 'NON_BLOCKING'
COMMENT 'LEGACY: UI/관제 표시용, FSM 판단에 사용 금지';

-- 5. issues.reason_code ENUM 값 명확화
ALTER TABLE issues 
MODIFY COLUMN reason_code ENUM(
    'DAMAGED',           -- 파손
    'MOVE_LOCATION',     -- 지번 이동
    'WAITING_RETURN',    -- 반품 대기
    'STOCK_EXISTS',      -- 재고 있음 (OOS 오류)
    'UNKNOWN',           -- 미확인
    'AUTO_RESOLVED'      -- 자동 해결
) NOT NULL DEFAULT 'UNKNOWN'
COMMENT 'AI가 판단한 원인/처리방향 (ai_decision과 분리: ai_decision=판정성격, reason_code=처리방법)';
