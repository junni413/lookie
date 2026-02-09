package lookie.backend.domain.worklog.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

// 근무 기록(WorkLog) 관련 요청 데이터 전달하기 위한 DTO 클래스
public class WorkLogRequestDto {

    // 근무 상태 변경(휴식, 조퇴 등) 요청 시 사용하는 내부 클래스
    @Getter
    @NoArgsConstructor
    public static class StatusChange {
        private String reason; // 상태 변경 사유
    }
}