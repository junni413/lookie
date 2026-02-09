-- V20260204_02__add_missing_foreign_keys.sql
-- 목적:
-- 1) users.assigned_zone_id -> zones.zone_id FK 추가
-- 2) issues.zone_location_id -> zone_locations.location_id FK 추가
-- 3) batch_task_items.location_id -> zone_locations.location_id FK 추가
-- 4) call_history caller/callee/issue FK 추가

-- ============================================================
-- (권장) 마이그레이션 실행 전에 아래 SELECT들을 수동으로 먼저 돌려서
-- "FK 위반 데이터"가 있는지 확인하면 원인 파악이 매우 빨라짐.
-- 결과가 0 rows면, 아래 ALTER TABLE은 100% 성공함.
-- ============================================================

-- [Precheck-1] users.assigned_zone_id -> zones.zone_id
-- SELECT assigned_zone_id
-- FROM users
-- WHERE assigned_zone_id IS NOT NULL
--   AND assigned_zone_id NOT IN (SELECT zone_id FROM zones);

-- [Precheck-2] issues.zone_location_id -> zone_locations.location_id
-- SELECT zone_location_id
-- FROM issues
-- WHERE zone_location_id IS NOT NULL
--   AND zone_location_id NOT IN (SELECT location_id FROM zone_locations);

-- [Precheck-3] batch_task_items.location_id -> zone_locations.location_id
-- SELECT location_id
-- FROM batch_task_items
-- WHERE location_id NOT IN (SELECT location_id FROM zone_locations);

-- [Precheck-4] call_history caller/callee/issue
-- SELECT caller_id FROM call_history
-- WHERE caller_id NOT IN (SELECT user_id FROM users);
-- SELECT callee_id FROM call_history
-- WHERE callee_id NOT IN (SELECT user_id FROM users);
-- SELECT issue_id FROM call_history
-- WHERE issue_id IS NOT NULL
--   AND issue_id NOT IN (SELECT issue_id FROM issues);

-- ============================================================
-- FK 추가
-- ============================================================

-- 1) users.assigned_zone_id -> zones.zone_id
ALTER TABLE users
  ADD CONSTRAINT fk_users_assigned_zone
  FOREIGN KEY (assigned_zone_id)
  REFERENCES zones(zone_id);

-- 2) issues.zone_location_id -> zone_locations.location_id
ALTER TABLE issues
  ADD CONSTRAINT fk_issues_zone_location
  FOREIGN KEY (zone_location_id)
  REFERENCES zone_locations(location_id);

-- 3) batch_task_items.location_id -> zone_locations.location_id
ALTER TABLE batch_task_items
  ADD CONSTRAINT fk_batch_task_items_location
  FOREIGN KEY (location_id)
  REFERENCES zone_locations(location_id);

-- 4) call_history FKs
ALTER TABLE call_history
  ADD CONSTRAINT fk_call_history_caller
  FOREIGN KEY (caller_id)
  REFERENCES users(user_id),
  ADD CONSTRAINT fk_call_history_callee
  FOREIGN KEY (callee_id)
  REFERENCES users(user_id),
  ADD CONSTRAINT fk_call_history_issue
  FOREIGN KEY (issue_id)
  REFERENCES issues(issue_id);

-- (선택) call_history 조회 최적화 인덱스 (FK랑 무관하지만 실무상 추천)
-- 이미 필요 없으면 삭제해도 됨
CREATE INDEX idx_call_history_caller ON call_history(caller_id);
CREATE INDEX idx_call_history_callee ON call_history(callee_id);
CREATE INDEX idx_call_history_issue  ON call_history(issue_id);
