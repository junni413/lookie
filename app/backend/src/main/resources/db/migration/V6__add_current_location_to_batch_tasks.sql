-- batch_tasks 테이블에 현재 스캔된 지번 ID 저장 컬럼 추가
ALTER TABLE batch_tasks
  ADD COLUMN current_location_id BIGINT
  NULL COMMENT '현재 작업자가 위치한 지번 ID (스캔 성공 시 저장)';

ALTER TABLE batch_tasks
  ADD CONSTRAINT fk_batch_tasks_current_location
    FOREIGN KEY (current_location_id) REFERENCES zone_locations(location_id);
