-- TaskMapperTest용 cleanup 데이터

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE batch_task_items;
TRUNCATE TABLE totes;
TRUNCATE TABLE batch_tasks;
TRUNCATE TABLE batches;
TRUNCATE TABLE zone_assignments;
TRUNCATE TABLE zones;

SET FOREIGN_KEY_CHECKS = 1;
