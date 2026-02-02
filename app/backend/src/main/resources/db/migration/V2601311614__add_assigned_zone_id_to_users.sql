-- users 테이블에 관리자가 배정하는 '담당 구역 ID' 컬럼 추가
ALTER TABLE users
    ADD COLUMN assigned_zone_id BIGINT NULL COMMENT '관리자에 의해 배정된 담당 구역 ID';