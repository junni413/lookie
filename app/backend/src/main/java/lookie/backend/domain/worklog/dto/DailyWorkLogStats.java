package lookie.backend.domain.worklog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 프론트엔드 캘린더용 일별 근무 시간 통계 데이터
 * (날짜 + 총 근무 시간/분)
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyWorkLogStats {
    private String date;         // 날짜 (YYYY-MM-DD)
    private long hours;          // 총 근무 시간 (시)
    private long minutes;        // 총 근무 시간 (분) - 시간 제외 나머지 분
    private long totalMinutes;   // 총 근무 분 (정렬 및 계산용)
}