-- batch_task_items 테이블의 status 컬럼 ENUM에 'ISSUE_PENDING' 상태 추가
-- 관리자 부재 등으로 인해 즉시 처리가 불가능하여 보류된 상태를 나타냄 (NON_BLOCKING 흐름 지원)
ALTER TABLE batch_task_items 
MODIFY COLUMN status ENUM('PENDING', 'DONE', 'ISSUE', 'ISSUE_PENDING') NOT NULL DEFAULT 'PENDING';
