from datetime import datetime, timedelta
import pendulum

from airflow import DAG
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator

# =========================================================
# Timezone
# =========================================================
KST = pendulum.timezone("Asia/Seoul")

DEFAULT_ARGS = {
    "owner": "ai-rebalance",
    "retries": 1,
    "retry_delay": timedelta(minutes=1),
}

# =========================================================
# ✅ DB에서 KST 기준으로 "현재 시각" 생성 (서버 timezone 달라도 안전)
# =========================================================
NOW_KST = "CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+09:00')"

# 5분 단위 floor timestamp (300초)
FLOOR_TS_EXPR = f"FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP({NOW_KST})/300)*300)"


# =========================================================
# 1) INSERT/UPSERT snapshot rows
# =========================================================
# 설계 요약
# - active_batch: status=IN_PROGRESS 1개를 current로 봄(여러 개면 deadline이 가장 빠른 것)
# - worker zone: zone_assignments에서 ts 기준 활성 배정(재배치 TEMP 반영)
#   없으면 batch_tasks.zone_id로 fallback
# - worker_metrics: batch_tasks + batch_task_items 합쳐서 picked/required/remaining 계산
# - zone_backlog: zone 단위 잔량 합 (batch_tasks.zone_id 기준)
# - zone_active_workers: ts 기준 zone_assignments 활성 배정 인원수
# - zone_location_cnt: zone_locations에서 is_active=1 개수
# - zone_blocking_issue_cnt:
#     옵션 A) issues.zone_location_id -> zone_locations.zone_id 로 귀속 (존위치가 잘 채워질 때)
#     옵션 B) issues.batch_task_id -> batch_tasks.zone_id 로 귀속 (운영 정합성/성능 측면에서 안정적)
#   여기서는 "B"를 기본으로 사용(존위치 NULL 이어도 동작)
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
-- ---------------------------------------------------------
-- (A) 현재 진행 중인 배치 1개 선택
-- ---------------------------------------------------------
active_batch AS (
  SELECT batch_id, deadline_at
  FROM batches
  WHERE status = 'IN_PROGRESS'
  ORDER BY deadline_at ASC
  LIMIT 1
),

-- ---------------------------------------------------------
-- (B) ts 기준 활성 zone 배정(재배치 TEMP 반영)
-- ---------------------------------------------------------
active_assign AS (
  SELECT worker_id, zone_id
  FROM (
    SELECT
      worker_id,
      zone_id,
      ROW_NUMBER() OVER (PARTITION BY worker_id ORDER BY started_at DESC) AS rn
    FROM zone_assignments
    WHERE started_at <= {FLOOR_TS_EXPR}
      AND (ended_at IS NULL OR ended_at > {FLOOR_TS_EXPR})
  ) t
  WHERE rn = 1
),

-- ---------------------------------------------------------
-- (C) worker 단위 작업량 집계 (현재 batch의 task 기준)
--  - batch_tasks.status 조건: 보통 IN_PROGRESS만 스냅샷 대상으로
-- ---------------------------------------------------------
worker_metrics AS (
  SELECT
    {FLOOR_TS_EXPR} AS ts,
    bt.batch_id,
    bt.worker_id,
    COALESCE(aa.zone_id, bt.zone_id) AS zone_id,
    COALESCE(SUM(bti.required_qty), 0) AS required_total,
    COALESCE(SUM(bti.picked_qty), 0)   AS picked_total,
    GREATEST(COALESCE(SUM(bti.required_qty), 0) - COALESCE(SUM(bti.picked_qty), 0), 0) AS remaining_qty
  FROM batch_tasks bt
  JOIN active_batch ab ON ab.batch_id = bt.batch_id
  LEFT JOIN batch_task_items bti ON bti.batch_task_id = bt.batch_task_id
  LEFT JOIN active_assign aa ON aa.worker_id = bt.worker_id
  WHERE bt.status = 'IN_PROGRESS'
    AND bt.worker_id IS NOT NULL
  GROUP BY bt.batch_id, bt.worker_id, COALESCE(aa.zone_id, bt.zone_id)
),

-- ---------------------------------------------------------
-- (D) zone_backlog: 현재 batch 기준 zone 잔량 합
-- ---------------------------------------------------------
zone_backlog AS (
  SELECT
    bt.zone_id,
    SUM(GREATEST(COALESCE(bti.required_qty,0) - COALESCE(bti.picked_qty,0), 0)) AS zone_backlog
  FROM batch_tasks bt
  JOIN active_batch ab ON ab.batch_id = bt.batch_id
  LEFT JOIN batch_task_items bti ON bti.batch_task_id = bt.batch_task_id
  GROUP BY bt.zone_id
),

-- ---------------------------------------------------------
-- (E) zone_active_workers: ts 기준 활성 배정 인원 수
-- ---------------------------------------------------------
zone_active AS (
  SELECT
    zone_id,
    COUNT(DISTINCT worker_id) AS zone_active_workers
  FROM zone_assignments
  WHERE started_at <= {FLOOR_TS_EXPR}
    AND (ended_at IS NULL OR ended_at > {FLOOR_TS_EXPR})
  GROUP BY zone_id
),

-- ---------------------------------------------------------
-- (F) zone_location_cnt: 활성 location 개수
-- ---------------------------------------------------------
zone_loc_cnt AS (
  SELECT
    zone_id,
    COUNT(*) AS zone_location_cnt
  FROM zone_locations
  WHERE is_active = 1
  GROUP BY zone_id
),

-- ---------------------------------------------------------
-- (G) zone_blocking_issue_cnt: OPEN+BLOCKING 이슈 수
--   기본: issues.batch_task_id -> batch_tasks.zone_id 로 귀속 (안전)
-- ---------------------------------------------------------
zone_blocking AS (
  SELECT
    bt.zone_id,
    COUNT(*) AS zone_blocking_issue_cnt
  FROM issues i
  JOIN batch_tasks bt ON bt.batch_task_id = i.batch_task_id
  JOIN active_batch ab ON ab.batch_id = bt.batch_id
  WHERE i.status = 'OPEN'
    AND i.issue_handling = 'BLOCKING'
  GROUP BY bt.zone_id
),

-- ---------------------------------------------------------
-- (H) worker_time: planned_end까지 남은 분
-- ---------------------------------------------------------
worker_time AS (
  SELECT
    wl.worker_id,
    TIMESTAMPDIFF(MINUTE, {NOW_KST}, MAX(wl.planned_end_at)) AS time_to_planned_end_min
  FROM work_logs wl
  WHERE wl.ended_at IS NULL
  GROUP BY wl.worker_id
)

-- ---------------------------------------------------------
-- Final INSERT SELECT
-- ---------------------------------------------------------
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

  -- 아래는 후처리 UPDATE에서 채움
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


# =========================================================
# 2) UPDATE speed_label
# =========================================================
# speed_label = (picked_total(now) - picked_total(prev_5m)) / 5m * 60
#            = delta_picked * 12
UPDATE_SPEED_LABEL_SQL = f"""
UPDATE rebalance_snapshots cur
LEFT JOIN rebalance_snapshots prev
  ON prev.worker_id = cur.worker_id
 AND prev.ts = DATE_SUB(cur.ts, INTERVAL 5 MINUTE)
SET cur.speed_label = GREATEST(COALESCE(cur.picked_total - prev.picked_total, 0) * 12, 0)
WHERE cur.ts = {FLOOR_TS_EXPR};
"""


# =========================================================
# 3) UPDATE worker_speed_30m_avg  (누수 방지: 현재 ts 제외)
# =========================================================
# worker_speed_30m_avg = avg(speed_label) over [ts-30m, ts)
# - 과거가 없으면 global 평균(최근 1일)로 fallback
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
CROSS JOIN (
  SELECT COALESCE(AVG(speed_label), 0) AS global_avg
  FROM rebalance_snapshots
  WHERE ts >= DATE_SUB({FLOOR_TS_EXPR}, INTERVAL 1 DAY)
    AND ts <  {FLOOR_TS_EXPR}
    AND speed_label IS NOT NULL
) g
SET cur.worker_speed_30m_avg = COALESCE(r.avg_30m, g.global_avg, 0)
WHERE cur.ts = {FLOOR_TS_EXPR};
"""


# =========================================================
# DAG
# =========================================================
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
