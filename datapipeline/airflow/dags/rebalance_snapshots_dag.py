from datetime import datetime, timedelta
import pendulum

from airflow import DAG
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator

KST = pendulum.timezone("Asia/Seoul")

DEFAULT_ARGS = {
    "owner": "ai-rebalance",
    "retries": 1,
    "retry_delay": timedelta(minutes=1),
}

# ✅ MySQL 내부에서 KST로 통일 (DB timezone 설정이 애매해도 안전)
NOW_KST = "CONVERT_TZ(NOW(), '+00:00', '+09:00')"
FLOOR_TS_EXPR = f"FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP({NOW_KST})/300)*300)"

INSERT_SNAPSHOT_SQL = f"""
INSERT INTO rebalance_snapshots (
  ts, batch_id, worker_id, zone_id,
  progress, remaining_qty,
  time_to_planned_end_min, time_to_deadline_min,
  zone_backlog, zone_active_workers, zone_location_cnt, zone_blocking_issue_cnt,
  worker_speed_30m_avg, speed_label,
  picked_total, required_total
)
WITH
active_batch AS (
  SELECT batch_id, deadline_at
  FROM batches
  WHERE status = 'IN_PROGRESS'
  ORDER BY deadline_at ASC
  LIMIT 1
),
worker_metrics AS (
  SELECT
    {FLOOR_TS_EXPR} AS ts,
    bt.batch_id,
    bt.worker_id,
    bt.zone_id,
    SUM(bti.required_qty) AS required_total,
    SUM(bti.picked_qty)   AS picked_total,
    SUM(bti.required_qty - bti.picked_qty) AS remaining_qty
  FROM batch_tasks bt
  JOIN batch_task_items bti ON bti.batch_task_id = bt.batch_task_id
  JOIN active_batch ab ON ab.batch_id = bt.batch_id
  WHERE bt.status = 'IN_PROGRESS'
    AND bt.worker_id IS NOT NULL
  GROUP BY bt.batch_id, bt.worker_id, bt.zone_id
),
zone_backlog AS (
  SELECT
    zl.zone_id,
    SUM(bti.required_qty - bti.picked_qty) AS zone_backlog
  FROM batch_tasks bt
  JOIN batch_task_items bti ON bti.batch_task_id = bt.batch_task_id
  JOIN zone_locations zl ON zl.location_id = bti.location_id
  JOIN active_batch ab ON ab.batch_id = bt.batch_id
  WHERE bt.status IN ('UNASSIGNED','IN_PROGRESS','COMPLETED')
  GROUP BY zl.zone_id
),
zone_active AS (
  SELECT zone_id, COUNT(*) AS zone_active_workers
  FROM zone_assignments
  WHERE ended_at IS NULL
  GROUP BY zone_id
),
zone_loc_cnt AS (
  SELECT zone_id, COUNT(*) AS zone_location_cnt
  FROM zone_locations
  WHERE is_active = 1
  GROUP BY zone_id
),
zone_blocking AS (
  SELECT zl.zone_id, COUNT(*) AS zone_blocking_issue_cnt
  FROM issues i
  JOIN zone_locations zl ON zl.location_id = i.zone_location_id
  WHERE i.status='OPEN' AND i.issue_handling='BLOCKING'
  GROUP BY zl.zone_id
),
worker_time AS (
  SELECT
    wl.worker_id,
    TIMESTAMPDIFF(MINUTE, {NOW_KST}, wl.planned_end_at) AS time_to_planned_end_min
  FROM work_logs wl
  WHERE wl.ended_at IS NULL
)
SELECT
  wm.ts,
  wm.batch_id,
  wm.worker_id,
  wm.zone_id,

  CASE WHEN wm.required_total > 0 THEN wm.picked_total / wm.required_total ELSE 0 END AS progress,
  wm.remaining_qty,

  COALESCE(wt.time_to_planned_end_min, 0) AS time_to_planned_end_min,
  TIMESTAMPDIFF(MINUTE, {NOW_KST}, ab.deadline_at) AS time_to_deadline_min,

  COALESCE(zb.zone_backlog, 0) AS zone_backlog,
  COALESCE(za.zone_active_workers, 0) AS zone_active_workers,
  COALESCE(zl.zone_location_cnt, 0) AS zone_location_cnt,
  COALESCE(zi.zone_blocking_issue_cnt, 0) AS zone_blocking_issue_cnt,

  0.0 AS worker_speed_30m_avg,
  NULL AS speed_label,

  wm.picked_total,
  wm.required_total
FROM worker_metrics wm
JOIN active_batch ab ON ab.batch_id = wm.batch_id
LEFT JOIN worker_time wt ON wt.worker_id = wm.worker_id
LEFT JOIN zone_backlog zb ON zb.zone_id = wm.zone_id
LEFT JOIN zone_active za ON za.zone_id = wm.zone_id
LEFT JOIN zone_loc_cnt zl ON zl.zone_id = wm.zone_id
LEFT JOIN zone_blocking zi ON zi.zone_id = wm.zone_id
ON DUPLICATE KEY UPDATE
  batch_id=VALUES(batch_id),
  zone_id=VALUES(zone_id),
  progress=VALUES(progress),
  remaining_qty=VALUES(remaining_qty),
  time_to_planned_end_min=VALUES(time_to_planned_end_min),
  time_to_deadline_min=VALUES(time_to_deadline_min),
  zone_backlog=VALUES(zone_backlog),
  zone_active_workers=VALUES(zone_active_workers),
  zone_location_cnt=VALUES(zone_location_cnt),
  zone_blocking_issue_cnt=VALUES(zone_blocking_issue_cnt),
  picked_total=VALUES(picked_total),
  required_total=VALUES(required_total);
"""

# ✅ prev 없으면 0 처리(원하면 NULL 유지로 바꿀 수 있음)
UPDATE_SPEED_LABEL_SQL = f"""
UPDATE rebalance_snapshots cur
LEFT JOIN rebalance_snapshots prev
  ON prev.worker_id = cur.worker_id
 AND prev.ts = DATE_SUB(cur.ts, INTERVAL 5 MINUTE)
SET cur.speed_label = GREATEST(COALESCE(cur.picked_total - prev.picked_total, 0) * 12, 0)
WHERE cur.ts = {FLOOR_TS_EXPR};
"""

UPDATE_SPEED_30M_SQL = f"""
UPDATE rebalance_snapshots cur
LEFT JOIN (
  SELECT worker_id, AVG(speed_label) AS avg_30m
  FROM rebalance_snapshots
  WHERE ts >= DATE_SUB({FLOOR_TS_EXPR}, INTERVAL 30 MINUTE)
    AND ts <  {FLOOR_TS_EXPR}
    AND speed_label IS NOT NULL
  GROUP BY worker_id
) r ON r.worker_id = cur.worker_id
SET cur.worker_speed_30m_avg = COALESCE(r.avg_30m, 0)
WHERE cur.ts = {FLOOR_TS_EXPR};
"""

with DAG(
    dag_id="rebalance_snapshots_5min",
    default_args=DEFAULT_ARGS,
    start_date=datetime(2026, 2, 1, tzinfo=KST),
    schedule="*/5 * * * *",
    catchup=False,
    max_active_runs=1,
    tags=["rebalance", "snapshots"],
) as dag:

    insert_snapshot_rows = SQLExecuteQueryOperator(
        task_id="insert_snapshot_rows",
        conn_id="lookie_mysql",
        sql=INSERT_SNAPSHOT_SQL,
    )

    update_speed_label = SQLExecuteQueryOperator(
        task_id="update_speed_label",
        conn_id="lookie_mysql",
        sql=UPDATE_SPEED_LABEL_SQL,
    )

    update_speed_30m_avg = SQLExecuteQueryOperator(
        task_id="update_speed_30m_avg",
        conn_id="lookie_mysql",
        sql=UPDATE_SPEED_30M_SQL,
    )

    insert_snapshot_rows >> update_speed_label >> update_speed_30m_avg
