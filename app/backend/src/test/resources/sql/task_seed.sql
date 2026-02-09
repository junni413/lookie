-- TaskMapperTest용 seed 데이터

-- 1. 체크 해제 (FK 제약 조건 무시)
SET FOREIGN_KEY_CHECKS = 0;

-- 2. 모든 테이블 비우기 (TRUNCATE로 초기화)
TRUNCATE TABLE batch_task_items;
TRUNCATE TABLE totes;
TRUNCATE TABLE batch_tasks;
TRUNCATE TABLE batches;
TRUNCATE TABLE zone_assignments;
TRUNCATE TABLE zones;

-- 3. 체크 다시 활성화
SET FOREIGN_KEY_CHECKS = 1;

-- 4. 테스트 데이터 삽입
INSERT INTO zones (zone_id)
VALUES (1);

INSERT INTO batches (batch_id, batch_round, deadline_at)
VALUES (1, 1, NOW() + INTERVAL 1 DAY);

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
