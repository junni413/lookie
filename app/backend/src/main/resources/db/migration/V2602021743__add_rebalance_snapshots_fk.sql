ALTER TABLE rebalance_snapshots
  ADD CONSTRAINT fk_snapshots_batch  FOREIGN KEY (batch_id)  REFERENCES batches(batch_id),
  ADD CONSTRAINT fk_snapshots_worker FOREIGN KEY (worker_id) REFERENCES users(user_id),
  ADD CONSTRAINT fk_snapshots_zone   FOREIGN KEY (zone_id)   REFERENCES zones(zone_id);
