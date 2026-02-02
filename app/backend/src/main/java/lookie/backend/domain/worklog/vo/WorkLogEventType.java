package lookie.backend.domain.worklog.vo;

public enum WorkLogEventType {
    START,   // 근무 시작 (출근)
    PAUSE,   // 휴식/일시정지
    RESUME,  // 근무 재개
    END      // 근무 종료 (퇴근)
}