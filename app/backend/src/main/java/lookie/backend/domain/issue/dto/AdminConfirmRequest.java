package lookie.backend.domain.issue.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 관리자 확정 요청 DTO
 * - 분기표 D14, S7 노드
 */
@Data
@NoArgsConstructor
public class AdminConfirmRequest {

    /**
     * 관리자 확정 결과
     * 
     * DAMAGED 타입:
     * - NORMAL: 정상 판정 (파손 아님)
     * - DAMAGED: 파손 확정 → Inventory Event 필요
     * - CALLED_OTHER_PROCESS: 다른 공정 호출 (재고 이벤트 없음)
     * 
     * OUT_OF_STOCK 타입:
     * - FIXED: 전산 오류 수정 완료
     */
    private AdminDecision adminDecision;
}
