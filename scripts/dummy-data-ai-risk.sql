-- Force AI risk mix: 1 CRITICAL, 2 NORMAL, 1 STABLE (best-effort for 4 zones)
-- This script rewrites rebalance_snapshots for zones 1~4 using current workers.

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE rebalance_snapshots;
SET FOREIGN_KEY_CHECKS = 1;

SET @snap_ts = NOW();

-- Zone 1: CRITICAL (risk > 20000)
INSERT INTO rebalance_snapshots (
  ts, batch_id, worker_id, zone_id,
  progress, remaining_qty,
  time_to_planned_end_min, time_to_deadline_min,
  zone_backlog, zone_active_workers, zone_location_cnt, zone_blocking_issue_cnt,
  worker_speed_30m_avg, speed_label,
  picked_total, required_total
)
SELECT
  @snap_ts as ts,
  1 as batch_id,
  u.user_id as worker_id,
  1 as zone_id,
  0.10 as progress,
  600 as remaining_qty,
  240 as time_to_planned_end_min,
  180 as time_to_deadline_min,
  1500 as zone_backlog,
  10 as zone_active_workers,
  72 as zone_location_cnt,
  0 as zone_blocking_issue_cnt,
  20 as worker_speed_30m_avg,
  20 as speed_label,
  0 as picked_total,
  800 as required_total
FROM users u
JOIN work_logs wl ON wl.worker_id = u.user_id AND wl.ended_at IS NULL
WHERE u.role = 'WORKER' AND u.assigned_zone_id = 1
ORDER BY u.user_id
LIMIT 8;

-- Zone 2: NORMAL (1000 < risk < 20000)
INSERT INTO rebalance_snapshots (
  ts, batch_id, worker_id, zone_id,
  progress, remaining_qty,
  time_to_planned_end_min, time_to_deadline_min,
  zone_backlog, zone_active_workers, zone_location_cnt, zone_blocking_issue_cnt,
  worker_speed_30m_avg, speed_label,
  picked_total, required_total
)
SELECT
  @snap_ts as ts,
  1 as batch_id,
  u.user_id as worker_id,
  2 as zone_id,
  0.50 as progress,
  300 as remaining_qty,
  240 as time_to_planned_end_min,
  180 as time_to_deadline_min,
  1050 as zone_backlog,
  12 as zone_active_workers,
  72 as zone_location_cnt,
  0 as zone_blocking_issue_cnt,
  35 as worker_speed_30m_avg,
  35 as speed_label,
  500 as picked_total,
  1000 as required_total
FROM users u
JOIN work_logs wl ON wl.worker_id = u.user_id AND wl.ended_at IS NULL
WHERE u.role = 'WORKER' AND u.assigned_zone_id = 2
ORDER BY u.user_id
LIMIT 8;

-- Zone 3: NORMAL (1000 < risk < 20000)
INSERT INTO rebalance_snapshots (
  ts, batch_id, worker_id, zone_id,
  progress, remaining_qty,
  time_to_planned_end_min, time_to_deadline_min,
  zone_backlog, zone_active_workers, zone_location_cnt, zone_blocking_issue_cnt,
  worker_speed_30m_avg, speed_label,
  picked_total, required_total
)
SELECT
  @snap_ts as ts,
  1 as batch_id,
  u.user_id as worker_id,
  3 as zone_id,
  0.55 as progress,
  260 as remaining_qty,
  240 as time_to_planned_end_min,
  180 as time_to_deadline_min,
  650 as zone_backlog,
  12 as zone_active_workers,
  72 as zone_location_cnt,
  0 as zone_blocking_issue_cnt,
  35 as worker_speed_30m_avg,
  35 as speed_label,
  450 as picked_total,
  1000 as required_total
FROM users u
JOIN work_logs wl ON wl.worker_id = u.user_id AND wl.ended_at IS NULL
WHERE u.role = 'WORKER' AND u.assigned_zone_id = 3
ORDER BY u.user_id
LIMIT 8;

-- Zone 4: STABLE (<= 1000)
INSERT INTO rebalance_snapshots (
  ts, batch_id, worker_id, zone_id,
  progress, remaining_qty,
  time_to_planned_end_min, time_to_deadline_min,
  zone_backlog, zone_active_workers, zone_location_cnt, zone_blocking_issue_cnt,
  worker_speed_30m_avg, speed_label,
  picked_total, required_total
)
SELECT
  @snap_ts as ts,
  1 as batch_id,
  u.user_id as worker_id,
  4 as zone_id,
  0.90 as progress,
  50 as remaining_qty,
  240 as time_to_planned_end_min,
  240 as time_to_deadline_min,
  700 as zone_backlog,
  13 as zone_active_workers,
  72 as zone_location_cnt,
  0 as zone_blocking_issue_cnt,
  45 as worker_speed_30m_avg,
  45 as speed_label,
  900 as picked_total,
  1000 as required_total
FROM users u
JOIN work_logs wl ON wl.worker_id = u.user_id AND wl.ended_at IS NULL
WHERE u.role = 'WORKER' AND u.assigned_zone_id = 4
ORDER BY u.user_id
LIMIT 6;

-- --------------------------------
-- ProgressRate targets by zone
-- ZONE1: 30%, ZONE2: 50%, ZONE3: 70%, ZONE4: 95%
-- --------------------------------
-- Reset all items to PENDING first
UPDATE batch_task_items bti
JOIN batch_tasks bt ON bt.batch_task_id = bti.batch_task_id
SET bti.status = 'PENDING',
    bti.last_scanned_at = NULL,
    bti.completed_at = NULL
WHERE bt.zone_id IN (1,2,3,4);

-- ZONE 1 -> 30% DONE
SET @z1_total := (
  SELECT COUNT(*) FROM batch_task_items bti
  JOIN batch_tasks bt ON bt.batch_task_id = bti.batch_task_id
  WHERE bt.zone_id = 1
);
SET @z1_done := FLOOR(@z1_total * 0.30);
WITH z1_items AS (
  SELECT bti.batch_task_item_id,
         ROW_NUMBER() OVER (ORDER BY bti.batch_task_item_id) AS rn
  FROM batch_task_items bti
  JOIN batch_tasks bt ON bt.batch_task_id = bti.batch_task_id
  WHERE bt.zone_id = 1
)
UPDATE batch_task_items bti
JOIN z1_items z ON z.batch_task_item_id = bti.batch_task_item_id
SET bti.status = 'DONE',
    bti.last_scanned_at = NOW(),
    bti.completed_at = NOW()
WHERE z.rn <= @z1_done;

-- ZONE 2 -> 50% DONE
SET @z2_total := (
  SELECT COUNT(*) FROM batch_task_items bti
  JOIN batch_tasks bt ON bt.batch_task_id = bti.batch_task_id
  WHERE bt.zone_id = 2
);
SET @z2_done := FLOOR(@z2_total * 0.50);
WITH z2_items AS (
  SELECT bti.batch_task_item_id,
         ROW_NUMBER() OVER (ORDER BY bti.batch_task_item_id) AS rn
  FROM batch_task_items bti
  JOIN batch_tasks bt ON bt.batch_task_id = bti.batch_task_id
  WHERE bt.zone_id = 2
)
UPDATE batch_task_items bti
JOIN z2_items z ON z.batch_task_item_id = bti.batch_task_item_id
SET bti.status = 'DONE',
    bti.last_scanned_at = NOW(),
    bti.completed_at = NOW()
WHERE z.rn <= @z2_done;

-- ZONE 3 -> 70% DONE
SET @z3_total := (
  SELECT COUNT(*) FROM batch_task_items bti
  JOIN batch_tasks bt ON bt.batch_task_id = bti.batch_task_id
  WHERE bt.zone_id = 3
);
SET @z3_done := FLOOR(@z3_total * 0.70);
WITH z3_items AS (
  SELECT bti.batch_task_item_id,
         ROW_NUMBER() OVER (ORDER BY bti.batch_task_item_id) AS rn
  FROM batch_task_items bti
  JOIN batch_tasks bt ON bt.batch_task_id = bti.batch_task_id
  WHERE bt.zone_id = 3
)
UPDATE batch_task_items bti
JOIN z3_items z ON z.batch_task_item_id = bti.batch_task_item_id
SET bti.status = 'DONE',
    bti.last_scanned_at = NOW(),
    bti.completed_at = NOW()
WHERE z.rn <= @z3_done;

-- ZONE 4 -> 95% DONE
SET @z4_total := (
  SELECT COUNT(*) FROM batch_task_items bti
  JOIN batch_tasks bt ON bt.batch_task_id = bti.batch_task_id
  WHERE bt.zone_id = 4
);
SET @z4_done := FLOOR(@z4_total * 0.95);
WITH z4_items AS (
  SELECT bti.batch_task_item_id,
         ROW_NUMBER() OVER (ORDER BY bti.batch_task_item_id) AS rn
  FROM batch_task_items bti
  JOIN batch_tasks bt ON bt.batch_task_id = bti.batch_task_id
  WHERE bt.zone_id = 4
)
UPDATE batch_task_items bti
JOIN z4_items z ON z.batch_task_item_id = bti.batch_task_item_id
SET bti.status = 'DONE',
    bti.last_scanned_at = NOW(),
    bti.completed_at = NOW()
WHERE z.rn <= @z4_done;
