ALTER TABLE batch_tasks
  ADD COLUMN zone_id BIGINT NOT NULL,
  ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE batch_tasks
  ADD CONSTRAINT fk_batch_tasks_zone
    FOREIGN KEY (zone_id) REFERENCES zones(zone_id);

CREATE INDEX idx_batch_tasks_zone_status
  ON batch_tasks (zone_id, status);
