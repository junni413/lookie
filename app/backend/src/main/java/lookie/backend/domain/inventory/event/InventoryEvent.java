package lookie.backend.domain.inventory.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * 재고 변화 이벤트
 * - ApplicationEvent로 발행되어 AFTER_COMMIT 리스너에서 Redis 갱신
 */
@Getter
@Builder
@AllArgsConstructor
public class InventoryEvent {
    
    private final Long eventId;          // DB에 저장된 event_id
    private final String eventType;      // PICK_NORMAL, PICK_DAMAGED_TEMP, etc.
    private final Long productId;
    private final Long locationId;
    private final Integer quantityChange; // 음수=감소, 양수=증가
    private final String referenceType;   // TASK_ITEM, ISSUE, ADMIN, SYSTEM
    private final Long referenceId;
    private final Long createdBy;
}
