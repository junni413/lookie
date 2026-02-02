-- batch_tasks.action_status ENUM에 ADJUST_QUANTITY 추가
ALTER TABLE batch_tasks
  MODIFY COLUMN action_status ENUM(
    'SCAN_TOTE',
    'SCAN_LOCATION',
    'SCAN_ITEM',
    'ADJUST_QUANTITY',
    'COMPLETE_TASK'
  ) NOT NULL DEFAULT 'SCAN_TOTE'
  COMMENT '현재 세부 작업 단계';
