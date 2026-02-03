-- MOVE_LOCATION 케이스를 위한 new_location_id 컬럼 추가
-- AI가 찾은 새 지번 ID 저장용

ALTER TABLE issues
ADD COLUMN new_location_id BIGINT NULL
COMMENT 'AI가 찾은 새 지번 ID (MOVE_LOCATION 케이스만 사용)';

-- 외래 키 제약 조건 추가 (선택)
-- ALTER TABLE issues
-- ADD CONSTRAINT fk_issues_new_location
-- FOREIGN KEY (new_location_id) REFERENCES zone_locations(zone_location_id);
