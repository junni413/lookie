-- ==========================================
-- Inventory Management Tables
-- ==========================================

-- inventory_events: 재고 변화의 모든 이력 (Single Source of Truth)
CREATE TABLE inventory_events (
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type ENUM(
        'STOCK_INIT',           -- 초기 재고 세팅
        'PICK_NORMAL',          -- 정상 집품 확정
        'PICK_DAMAGED_TEMP',    -- 파손 임시 차감
        'PICK_DAMAGED_FINAL',   -- 파손 확정 (마킹용, qty=0)
        'REVERT_DAMAGED'        -- 파손 취소/복구
    ) NOT NULL,
    product_id BIGINT NOT NULL,
    location_id BIGINT NOT NULL,
    quantity_change INT NOT NULL COMMENT '수량 변화 (음수=감소, 양수=증가)',
    
    -- 참조 정보 (이벤트 원인 추적)
    reference_type ENUM('TASK_ITEM', 'ISSUE', 'ADMIN', 'SYSTEM') NOT NULL,
    reference_id BIGINT NULL COMMENT '참조 대상 ID (task_item_id, issue_id 등)',
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL COMMENT '작업 수행자 (user_id)',
    
    CONSTRAINT fk_inventory_events_product
        FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT fk_inventory_events_location
        FOREIGN KEY (location_id) REFERENCES zone_locations(location_id),
        
    KEY idx_inventory_events_product_location (product_id, location_id),
    KEY idx_inventory_events_created (created_at),
    KEY idx_inventory_events_reference (reference_type, reference_id)
) ENGINE=InnoDB COMMENT='재고 변화 이벤트 로그 (불변)';

-- inventory_current: 현재 재고 상태 (스냅샷, 조회/복구용)
CREATE TABLE inventory_current (
    product_id BIGINT NOT NULL,
    location_id BIGINT NOT NULL,
    
    available_qty INT NOT NULL DEFAULT 0 COMMENT '가용 재고',
    damaged_temp_qty INT NOT NULL DEFAULT 0 COMMENT '파손 임시 처리 중 수량',
    
    last_event_id BIGINT NULL COMMENT '마지막 적용된 이벤트 ID (멱등성 보장)',
    last_event_type VARCHAR(50) NULL COMMENT '마지막 이벤트 타입 (디버깅용)',
    
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL COMMENT '마지막 업데이트 수행자',
    
    PRIMARY KEY (product_id, location_id),
    
    CONSTRAINT fk_inventory_current_product
        FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT fk_inventory_current_location
        FOREIGN KEY (location_id) REFERENCES zone_locations(location_id),
    CONSTRAINT fk_inventory_current_last_event
        FOREIGN KEY (last_event_id) REFERENCES inventory_events(event_id),
        
    KEY idx_inventory_current_updated (updated_at)
) ENGINE=InnoDB COMMENT='현재 재고 상태 (스냅샷)';
