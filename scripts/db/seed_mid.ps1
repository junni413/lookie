# Medium-scale seed data for integration testing.
# Inserts deterministic ranges to avoid clashing with real data.
# Requires docker container named "mysql" and DB "lookie".

$zoneStart=1001;$zoneCount=10
$linesPerZone=2;$locPerLine=5
$adminStart=4001;$adminCount=5
$workerStart=4101;$workerCount=50
$productStart=600001;$productCount=80
$batchInProgress=5001;$batchCompleted=5002
$taskStart=700001;$itemStart=800001

$sb=New-Object System.Text.StringBuilder
$null=$sb.AppendLine("SET FOREIGN_KEY_CHECKS=0;")

for($i=0;$i -lt $zoneCount;$i++){
  $z=$zoneStart+$i
  $null=$sb.AppendLine("INSERT IGNORE INTO zones(zone_id) VALUES ($z);")
}

$locationIds=@(); $zoneFirstLocation=@{}
$lineBase=200000; $locBase=300000
for($zi=0;$zi -lt $zoneCount;$zi++){
  $z=$zoneStart+$zi
  for($li=1;$li -le $linesPerZone;$li++){
    $lineId=$lineBase + ($zi*10) + $li
    $null=$sb.AppendLine("INSERT IGNORE INTO zone_lines(line_id, zone_id, line_name, is_active) VALUES ($lineId,$z,'L$li',1);")
    for($pi=1;$pi -le $locPerLine;$pi++){
      $locId=$locBase + ($zi*100) + ($li*10) + $pi
      $code="Z$z-L$li-" + $pi.ToString('00')
      $x=10*$pi; $y=10*$li + 5*$zi
      $null=$sb.AppendLine("INSERT IGNORE INTO zone_locations(location_id, zone_id, line_id, location_code, x, y, is_active) VALUES ($locId,$z,$lineId,'$code',$x,$y,1);")
      $locationIds += $locId
      if(-not $zoneFirstLocation.ContainsKey($z)){$zoneFirstLocation[$z]=$locId}
    }
  }
}

for($i=0;$i -lt $adminCount;$i++){
  $id=$adminStart+$i; $phone="010-2000-1" + $i.ToString('000'); $email="admin$id@test.local"
  $null=$sb.AppendLine("INSERT IGNORE INTO users(user_id, role, password_hash, name, phone_number, email, birth_date, is_active, assigned_zone_id) VALUES ($id,'ADMIN','x','Admin$id','$phone','$email',NULL,1,$zoneStart);")
}
for($i=0;$i -lt $workerCount;$i++){
  $id=$workerStart+$i; $zone=$zoneStart + ($i % $zoneCount); $phone="010-2000-2" + $i.ToString('000'); $email="worker$id@test.local"
  $null=$sb.AppendLine("INSERT IGNORE INTO users(user_id, role, password_hash, name, phone_number, email, birth_date, is_active, assigned_zone_id) VALUES ($id,'WORKER','x','Worker$id','$phone','$email',NULL,1,$zone);")
}

for($i=0;$i -lt $workerCount;$i++){
  $id=$workerStart+$i; $logId=900000+$i
  $null=$sb.AppendLine("INSERT IGNORE INTO work_logs(work_log_id, worker_id, started_at, planned_end_at, ended_at) VALUES ($logId,$id,NOW(),DATE_ADD(NOW(),INTERVAL 8 HOUR),NULL);")
}

$null=$sb.AppendLine("INSERT IGNORE INTO batches(batch_id, batch_round, started_at, completed_at, deadline_at, status, created_at) VALUES ($batchInProgress,1,NOW(),NULL,DATE_ADD(NOW(),INTERVAL 90 MINUTE),'IN_PROGRESS',NOW());")
$null=$sb.AppendLine("INSERT IGNORE INTO batches(batch_id, batch_round, started_at, completed_at, deadline_at, status, created_at) VALUES ($batchCompleted,0,DATE_SUB(NOW(),INTERVAL 4 HOUR),DATE_SUB(NOW(),INTERVAL 1 HOUR),DATE_SUB(NOW(),INTERVAL 2 HOUR),'COMPLETED',NOW());")

for($i=0;$i -lt $productCount;$i++){
  $prodId=$productStart+$i; $loc=$locationIds[$i % $locationIds.Count]; $zone=$zoneStart + ($i % $zoneCount)
  $null=$sb.AppendLine("INSERT IGNORE INTO products(product_id, barcode, product_name, product_image, location_id, zone_id) VALUES ($prodId,'P$prodId','Product $prodId',NULL,$loc,$zone);")
}

for($i=0;$i -lt $workerCount;$i++){
  $wid=$workerStart+$i; $zone=$zoneStart + ($i % $zoneCount); $taskId=$taskStart+$i; $locId=$zoneFirstLocation[$zone]
  $null=$sb.AppendLine("INSERT IGNORE INTO batch_tasks(batch_task_id, batch_id, worker_id, status, started_at, completed_at, tote_id, zone_id, created_at, updated_at, action_status, location_scanned_at, current_location_id) VALUES ($taskId,$batchInProgress,$wid,'IN_PROGRESS',NOW(),NULL,NULL,$zone,NOW(),NOW(),'SCAN_ITEM',NOW(),$locId);")
  $p1=$productStart + (($i*3) % $productCount); $p2=$productStart + (($i*3+1) % $productCount); $p3=$productStart + (($i*3+2) % $productCount)
  $itemId=$itemStart + ($i*3)
  $null=$sb.AppendLine("INSERT IGNORE INTO batch_task_items(batch_task_item_id, batch_task_id, product_id, location_id, required_qty, picked_qty, status, completed_at, last_scanned_at) VALUES ($itemId,$taskId,$p1,$locId,10,10,'DONE',NOW(),NOW());")
  $null=$sb.AppendLine("INSERT IGNORE INTO batch_task_items(batch_task_item_id, batch_task_id, product_id, location_id, required_qty, picked_qty, status, completed_at, last_scanned_at) VALUES ($($itemId+1),$taskId,$p2,$locId,8,5,'IN_PROGRESS',NULL,NOW());")
  $null=$sb.AppendLine("INSERT IGNORE INTO batch_task_items(batch_task_item_id, batch_task_id, product_id, location_id, required_qty, picked_qty, status, completed_at, last_scanned_at) VALUES ($($itemId+2),$taskId,$p3,$locId,6,0,'PENDING',NULL,NOW());")
}

for($i=0;$i -lt $workerCount;$i++){
  $wid=$workerStart+$i; $zone=$zoneStart + ($i % $zoneCount); $speed=20 + (5*($i % 5)); $backlog=20 + (3*($i % 7))
  $picked=5 + ($i % 10); $required=20; $progress=[math]::Round($picked/$required,5)
  $null=$sb.AppendLine("INSERT IGNORE INTO rebalance_snapshots(ts, batch_id, worker_id, zone_id, progress, remaining_qty, time_to_planned_end_min, time_to_deadline_min, zone_backlog, zone_active_workers, zone_location_cnt, zone_blocking_issue_cnt, worker_speed_30m_avg, speed_label, created_at, picked_total, required_total) VALUES (NOW(),$batchInProgress,$wid,$zone,$progress,10,120,90,$backlog,1,$($linesPerZone*$locPerLine),0,$speed,$speed,NOW(),$picked,$required);")
}

for($i=0;$i -lt 10;$i++){
  $wid=$workerStart+$i; $taskId=$taskStart+$i; $itemId=$itemStart+($i*3)
  $null=$sb.AppendLine("INSERT IGNORE INTO issues(issue_id, issue_type, status, reason_code, worker_id, admin_id, batch_task_id, batch_task_item_id, zone_location_id, created_at, resolved_at, note, issue_handling, admin_required, urgency, admin_decision, new_location_id, ai_decision, webrtc_status) VALUES ($($itemStart+1000+$i),'DAMAGED','OPEN','DAMAGED',$wid,NULL,$taskId,$itemId,NULL,NOW(),NULL,NULL,'BLOCKING',1,2,NULL,NULL,'NEED_CHECK','WAITING');")
}

$null=$sb.AppendLine("SET FOREIGN_KEY_CHECKS=1;")

$sb.ToString() | docker exec -i mysql mysql -uroot -pssafy lookie
