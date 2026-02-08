package lookie.backend.domain.issue.dto;

import lombok.Data;

/**
 * AdminConfirmRequest - 관리자 확정 요청 DTO
 */
@Data
public class AdminConfirmRequest {
    private String decision; // NORMAL, DAMAGED, CALLED_OTHER_PROCESS, FIXED

    // 기존 코드 호환성을 위한 필드 (alias)
    private String adminDecision; // decision과 동일 (alias)

    public String getAdminDecision() {
        return adminDecision != null ? adminDecision : decision;
    }
}
