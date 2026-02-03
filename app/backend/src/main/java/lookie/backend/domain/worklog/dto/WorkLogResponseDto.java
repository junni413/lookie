package lookie.backend.domain.worklog.dto;

import lookie.backend.domain.worklog.vo.WorkLog;
import lookie.backend.domain.worklog.vo.WorkLogEvent;
import lookie.backend.domain.worklog.vo.WorkLogEventType;
import lombok.Builder;
import lombok.Getter;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

// 근무 기록(WorkLog) 정보를 클라이언트에게 응답하기 위한 DTO 클래스
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WorkLogResponseDto {

    // 1. 기본 식별 정보
    private Long workLogId;              // 근무 로그 고유 식별자
    private Long workerId;              // 작업자(User) 고유 식별자
    private String workerName;          // 이름 + 번호 뒷자리 (ex- 김싸피1234)
    private Long assignedZoneId;                // 담당 구역

    // 2. 근태 정보
    private WorkLogEventType currentStatus; // 현재 근무 상세 상태 (START, PAUSE, RESUME, END)
    private LocalDateTime startedAt;    // 근무 시작 시각 (출근 시각)
    private LocalDateTime endedAt;      // 근무 종료 시각 (퇴근 시각)
    private String plannedEndAt;        // 퇴근 예정 시각 (정해진 시간, 현재는 출근 시각으로부터 5분뒤로 설정)
    private LocalDateTime lastStatusChangedAt;  // 마지막으로 상태가 변경된 시각

    // 3. 관제 맵 운영 정보 (실시간 위치 정보)
    private Long lineId;          // 현재 작업중인 라인 ID (UI 하이라이팅용)
    private String locationCode;  // 실제 지번 코드 (예: 11-A-01)

    // 4. 성과 지표 (DB 부하 방지 위해 현재는 null 반환, 추후 Redis 연동 시 사용)
    private Integer workCount;    // 금일 작업 완료 건수
    private Double workRate;      // 현재 작업의 진행률 (0.0 ~ 100.0)

    /**
     * VO 객체들을 응답용 DTO로 변환
     * * @param workLog 근무 세션 정보
     * @param lastEvent 해당 세션의 가장 최신 이벤트 (상태 판별용)
     * @return 변환된 WorkLogResponseDto
     */
    public static WorkLogResponseDto from(WorkLog workLog, WorkLogEvent lastEvent) {
        return WorkLogResponseDto.builder()
                .workLogId(workLog.getWorkLogId()) // MyBatis 스타일 필드 접근
                .workerId(workLog.getWorkerId())
                .startedAt(workLog.getStartedAt())
                .endedAt(workLog.getEndedAt())
                // 최신 이벤트가 없을 경우(최초 출근 직후) 기본 상태를 START로 설정
                .currentStatus(lastEvent != null ? lastEvent.getEventType() : WorkLogEventType.START)
                // 최신 이벤트가 없을 경우 상태 변경 시각을 근무 시작 시각으로 설정
                .lastStatusChangedAt(lastEvent != null ? lastEvent.getOccurredAt() : workLog.getStartedAt())
                .plannedEndAt(workLog.getPlannedEndAt() != null ?
                        workLog.getPlannedEndAt().toString() : null)
                .build();
    }
}