-- batch_tasks 테이블에 세부 작업 상태 및 지번 스캔 시각 추가
ALTER TABLE batch_tasks
  ADD COLUMN action_status ENUM(
    'SCAN_TOTE',
    'SCAN_LOCATION',
    'SCAN_ITEM',
    'COMPLETE_TASK'
  ) NOT NULL DEFAULT 'SCAN_TOTE'
  COMMENT '현재 세부 작업 단계',
  
  ADD COLUMN location_scanned_at DATETIME
  NULL COMMENT '지번(Location) 스캔 완료 시각';
