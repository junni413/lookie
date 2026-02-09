-- LiveKit 마이그레이션: open_vidu_session_id -> room_name 컬럼명 변경
-- 기존 데이터 유지 (옵션 A)

ALTER TABLE call_history 
CHANGE COLUMN open_vidu_session_id room_name VARCHAR(255) NOT NULL 
COMMENT 'LiveKit Room 이름';
