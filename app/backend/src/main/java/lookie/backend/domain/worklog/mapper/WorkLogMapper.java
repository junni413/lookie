package lookie.backend.domain.worklog.mapper;

import lookie.backend.domain.worklog.vo.WorkLog;
import lookie.backend.domain.worklog.vo.WorkLogEvent;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface WorkLogMapper {
    /** 출근 생성 */
    void insertWorkLog(WorkLog workLog);

    /** 퇴근 업데이트 */
    void updateWorkLogEnd(WorkLog workLog);

    /** 현재 진행중인 세션 조회 */
    Optional<WorkLog> findActiveWorkLogByWorkerId(@Param("workerId") Long workerId);

    /** 상태 변경 이벤트 기록 */
    void insertWorkLogEvent(WorkLogEvent event);

    /** 마지막 이벤트 조회 */
    WorkLogEvent findLastEventByWorkLogId(@Param("workLogId") Long workLogId);

    /**
     * 특정 작업자의 전체 근무 이력을 최신순으로 조회.
     */
    List<WorkLog> findAllByWorkerId(@Param("workerId") Long workerId);

}