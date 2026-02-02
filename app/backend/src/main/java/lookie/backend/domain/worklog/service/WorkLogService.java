package lookie.backend.domain.worklog.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.worklog.dto.WorkLogRequestDto;
import lookie.backend.domain.worklog.dto.WorkLogResponseDto;
import lookie.backend.domain.worklog.mapper.WorkLogMapper;
import lookie.backend.domain.worklog.vo.WorkLog;
import lookie.backend.domain.worklog.vo.WorkLogEvent;
import lookie.backend.domain.worklog.vo.WorkLogEventType;
import lookie.backend.global.error.ApiException;
import lookie.backend.global.error.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;


/**
 * 작업자의 근무 세션 및 상태 변경 이벤트를 관리하는 서비스
 * 근무 시작, 종료, 휴식, 재개 처리
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorkLogService {

    private final WorkLogMapper workLogMapper;

    /**
     * 1. 출근 처리 (START) 수행
     * 현재 종료되지 않은 근무 세션이 있는지 확인한 후, 새로운 세션과 시작 이벤트를 생성
     *
     * @param workerId 작업자 고유 식별자
     * @return 생성된 근무 정보 및 초기 상태 DTO
     * @throws ApiException 이미 출근한 상태일 경우 발생
     */
    @Transactional
    public WorkLogResponseDto startWork(Long workerId) {
        // 1-1. 중복 출근 검증
        workLogMapper.findActiveWorkLogByWorkerId(workerId).ifPresent(log -> {
            throw new ApiException(ErrorCode.SYSTEM_TEMPORARY_LOCK_FAILED, "이미 출근 처리된 상태입니다.");
        });

        // 1-2. 근무 세션 생성
        WorkLog workLog = WorkLog.builder()
                .workerId(workerId)
                .startedAt(LocalDateTime.now())
                .plannedEndAt(LocalDateTime.now().plusMinutes(5)) //기본 5분 뒤로 설정 (시연 용)
                .build();

        // 1-3. 시작(START) 이벤트 기록
        workLogMapper.insertWorkLog(workLog);
        WorkLogEvent event = createAndSaveEvent(workLog.getWorkLogId(), WorkLogEventType.START, "출근");

        return WorkLogResponseDto.from(workLog, event);
    }


    /**
     * 2. 퇴근 처리 (END) 수행
     * 활성화된 근무 세션을 찾아 종료 시각 업데이트 후 종료 이벤트 기록
     *
     * @param workerId 작업자 고유 식별자
     * @return 종료된 근무 정보 DTO
     * @throws ApiException 활성 근무 세션이 없을 경우 발생
     */
    @Transactional
    public WorkLogResponseDto endWork(Long workerId) {
        WorkLog workLog = getActiveWorkLogOrThrow(workerId);

        // 2-1. 종료 시각 반영 및 업데이트
        workLog.setEndedAt(LocalDateTime.now());
        workLogMapper.updateWorkLogEnd(workLog);

        // 2-2. 종료(END) 이벤트 기록
        WorkLogEvent event = createAndSaveEvent(workLog.getWorkLogId(), WorkLogEventType.END, "퇴근");
        return WorkLogResponseDto.from(workLog, event);
    }

    /**
     * 3. 작업 중단/휴식 (PAUSE) 상태 기록
     *
     * @param workerId 작업자 고유 식별자
     * @param request 중단 사유를 포함한 DTO
     * @return 변경된 상태 정보 DTO
     */
    @Transactional
    public WorkLogResponseDto pauseWork(Long workerId, WorkLogRequestDto.StatusChange request) {
        WorkLog workLog = getActiveWorkLogOrThrow(workerId);
        // 3-1. 중복 휴식 방지 검증
        validateStatusNot(workLog.getWorkLogId(), WorkLogEventType.PAUSE, ErrorCode.WEBRTC_USER_PAUSED);

        WorkLogEvent event = createAndSaveEvent(workLog.getWorkLogId(), WorkLogEventType.PAUSE, request.getReason());
        return WorkLogResponseDto.from(workLog, event);
    }

    /**
     * 4. 작업 재개 (RESUME) 상태 기록
     * 이전 상태가 반드시 휴식(PAUSE) 상태여야 함
     *
     * @param workerId 작업자 고유 식별자
     * @return 변경된 상태 정보 DTO
     * @throws ApiException 휴식 상태가 아닌데 재개를 시도할 경우 발생
     */
    @Transactional
    public WorkLogResponseDto resumeWork(Long workerId) {
        WorkLog workLog = getActiveWorkLogOrThrow(workerId);
        WorkLogEvent lastEvent = workLogMapper.findLastEventByWorkLogId(workLog.getWorkLogId());

        // 4-1. 상태 전이 유효성 검사
        if (lastEvent == null || lastEvent.getEventType() != WorkLogEventType.PAUSE) {
            throw new ApiException(ErrorCode.TASK_INVALID_STATE, "휴식 중인 상태에서만 재개가 가능합니다.");
        }

        WorkLogEvent event = createAndSaveEvent(workLog.getWorkLogId(), WorkLogEventType.RESUME, "작업 재개");
        return WorkLogResponseDto.from(workLog, event);
    }

    /**
     * 5. 현재 작업자의 활성 근무 상태 조회
     * 작업자 대시보드 및 관리자 모니터링에서 공통으로 사용
     *
     * @param workerId 조회할 작업자 ID
     * @return 현재 근무 정보 및 최신 상태 이벤트 DTO
     */
    @Transactional(readOnly = true)
    public WorkLogResponseDto getCurrentStatus(Long workerId) {
        WorkLog workLog = getActiveWorkLogOrThrow(workerId);
        WorkLogEvent lastEvent = workLogMapper.findLastEventByWorkLogId(workLog.getWorkLogId());
        return WorkLogResponseDto.from(workLog, lastEvent);
    }

    /**
     * 6. 진행 중인 근무 기록 조회하고 없으면 예외 던짐
     */
    private WorkLog getActiveWorkLogOrThrow(Long workerId) {
        return workLogMapper.findActiveWorkLogByWorkerId(workerId)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND, "활성 근무 기록이 없습니다."));
    }

    /**
     * 7. 마지막 이벤트 상태가 특정 상태가 아닌지 검증
     */
    private void validateStatusNot(Long workLogId, WorkLogEventType type, ErrorCode errorCode) {
        WorkLogEvent lastEvent = workLogMapper.findLastEventByWorkLogId(workLogId);
        if (lastEvent != null && lastEvent.getEventType() == type) {
            throw new ApiException(errorCode);
        }
    }

    /**
     * 8. 이벤트 생성 후 DB에 영구 저장
     */
    private WorkLogEvent createAndSaveEvent(Long workLogId, WorkLogEventType type, String reason) {
        WorkLogEvent event = WorkLogEvent.builder()
                .workLogId(workLogId)
                .eventType(type)
                .reason(reason)
                .occurredAt(LocalDateTime.now())
                .build();
        workLogMapper.insertWorkLogEvent(event);
        return event;
    }
}