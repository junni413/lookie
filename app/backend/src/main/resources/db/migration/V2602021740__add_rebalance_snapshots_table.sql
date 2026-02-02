CREATE TABLE rebalance_snapshots (
  ts DATETIME NOT NULL COMMENT 'snapshot timestamp (5m recommended)',
  batch_id BIGINT NOT NULL COMMENT 'batch id',
  worker_id BIGINT NOT NULL COMMENT 'worker id',
  zone_id BIGINT NOT NULL COMMENT 'zone id',

  progress DECIMAL(6,5) NOT NULL COMMENT '0..1',
  remaining_qty INT NOT NULL COMMENT 'remaining qty',

  time_to_planned_end_min INT NOT NULL COMMENT 'minutes to planned end',
  time_to_deadline_min INT NOT NULL COMMENT 'minutes to deadline',

  zone_backlog INT NOT NULL COMMENT 'zone backlog',
  zone_active_workers INT NOT NULL COMMENT 'active workers in zone',
  zone_location_cnt INT NOT NULL COMMENT 'location count in zone',
  zone_blocking_issue_cnt INT NOT NULL COMMENT 'open blocking issues in zone',

  worker_speed_30m_avg DECIMAL(10,4) NOT NULL COMMENT 'shifted 30m avg speed (qty/hour)',
  speed_label DECIMAL(10,4) NULL COMMENT 'label: delta_picked/delta_t*60',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (ts, worker_id),
  KEY idx_snapshots_batch_ts (batch_id, ts),
  KEY idx_snapshots_zone_ts (zone_id, ts),
  KEY idx_snapshots_worker_ts (worker_id, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;