-- rebalance_snapshots 테이블에 누적 집계 컬럼 추가
ALTER TABLE rebalance_snapshots
  ADD COLUMN picked_total INT NOT NULL DEFAULT 0,
  ADD COLUMN required_total INT NOT NULL DEFAULT 0;
