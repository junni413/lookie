-- TaskMapperTest용 seed 데이터

-- zone (존재하지 않으면 쿼리 자체가 의미 없음)
INSERT INTO zones (zone_id)
VALUES (1);

-- batch (FK 때문에 필요)
INSERT INTO batches (batch_id, batch_round, deadline_at)
VALUES (1, 1, NOW() + INTERVAL 1 DAY);

-- 핵심: UNASSIGNED 상태의 batch_task
INSERT INTO batch_tasks (
    batch_task_id,
    batch_id,
    zone_id,
    status,
    created_at,
    updated_at
)
VALUES (
    1,
    1,
    1,
    'UNASSIGNED',
    NOW(),
    NOW()
);
