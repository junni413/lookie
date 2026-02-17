# Cleanup for medium-scale seed data.
# Removes only the deterministic ranges inserted by seed_mid.ps1.

$zoneStart=1001;$zoneCount=10
$adminStart=4001;$adminCount=5
$workerStart=4101;$workerCount=50
$productStart=600001;$productCount=80
$batchInProgress=5001;$batchCompleted=5002
$taskStart=700001;$itemStart=800001

$zoneEnd=$zoneStart + $zoneCount - 1
$adminEnd=$adminStart + $adminCount - 1
$workerEnd=$workerStart + $workerCount - 1
$productEnd=$productStart + $productCount - 1
$taskEnd=$taskStart + $workerCount - 1
$itemEnd=$itemStart + ($workerCount*3) - 1
$issueStart=$itemStart + 1000
$issueEnd=$issueStart + 9

@"
SET FOREIGN_KEY_CHECKS=0;
DELETE FROM issues WHERE issue_id BETWEEN $issueStart AND $issueEnd;
DELETE FROM rebalance_snapshots WHERE batch_id=$batchInProgress AND worker_id BETWEEN $workerStart AND $workerEnd;
DELETE FROM batch_task_items WHERE batch_task_item_id BETWEEN $itemStart AND $itemEnd;
DELETE FROM batch_tasks WHERE batch_task_id BETWEEN $taskStart AND $taskEnd;
DELETE FROM batches WHERE batch_id IN ($batchInProgress,$batchCompleted);
DELETE FROM work_logs WHERE worker_id BETWEEN $workerStart AND $workerEnd;
DELETE FROM users WHERE user_id BETWEEN $workerStart AND $workerEnd OR user_id BETWEEN $adminStart AND $adminEnd;
DELETE FROM products WHERE product_id BETWEEN $productStart AND $productEnd;
DELETE FROM zone_locations WHERE zone_id BETWEEN $zoneStart AND $zoneEnd;
DELETE FROM zone_lines WHERE zone_id BETWEEN $zoneStart AND $zoneEnd;
DELETE FROM zones WHERE zone_id BETWEEN $zoneStart AND $zoneEnd;
SET FOREIGN_KEY_CHECKS=1;
"@ | docker exec -i mysql mysql -uroot -pssafy lookie
