package lookie.backend.domain.issue.vo;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import lookie.backend.domain.task.vo.TaskItemVO;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@Alias("IssueVO")
public class IssueVO {
    private Long issueId;
    private String issueType; // ENUM('DAMAGED','OUT_OF_STOCK')
    private String status; // ENUM('OPEN','RESOLVED')
    // private String priority; // 삭제됨 (urgency 대체)
    // AI 판정 결과 (FSM 가드용)
    private String aiDecision; // ENUM('PASS','FAIL','NEED_CHECK','RETAKE','UNKNOWN')
    private String reasonCode; // ENUM('DAMAGED','MOVE_LOCATION',WAITING_RETURN','STOCK_EXISTS','UNKNOWN','AUTO_RESOLVED')

    // WebRTC 연결 상태 (NEED_CHECK 정책용)
    private String webrtcStatus; // ENUM('NONE','WAITING','CONNECTED','MISSED')

    // LEGACY 필드 (FSM 판단에 사용 금지, UI/DTO용으로만 유지)
    private String issueHandling; // ENUM('BLOCKING','NON_BLOCKING') - LEGACY
    private Boolean adminRequired; // LEGACY: aiDecision==NEED_CHECK로 계산

    // 신규 정책 필드 (분기표 기준)
    private Integer urgency; // 관제 큐 우선순위 (0=큐 제외, 1=최상위, 5=최하위)
    private String adminDecision; // 관리자 확정 결과 (NORMAL/DAMAGED/CALLED_OTHER_PROCESS/FIXED)

    private Long workerId;
    private Long adminId;
    private Long batchTaskId;
    private Long batchTaskItemId;
    private Long zoneLocationId;
    private Long newLocationId; // MOVE_LOCATION 케이스: AI가 찾은 새 지번 ID

    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private String note;

    /**
     * 이슈 초기 생성 (새 FSM 기준)
     * pseudo_code.md createIssue 참조
     */
    public static IssueVO createInitial(Long workerId, TaskItemVO item, String issueType) {
        IssueVO issue = new IssueVO();

        // 기본 FSM 상태 초기화
        issue.setIssueType(issueType); // DAMAGED or OUT_OF_STOCK
        issue.setStatus("OPEN"); // Issue FSM 시작 상태
        issue.setAiDecision("UNKNOWN"); // AI 판정 전
        issue.setReasonCode("UNKNOWN"); // 원인 미확인
        issue.setWebrtcStatus("NONE"); // WebRTC 연결 시도 전

        // LEGACY 필드 (초기값, FSM 판단에는 미사용)
        issue.setUrgency(3); // 기본 우선순위: 중간
        issue.setIssueHandling("NON_BLOCKING"); // 기본: 비차단
        issue.setAdminRequired(false); // 기본: 관리자 불필요

        // 연관 데이터
        issue.setWorkerId(workerId);
        issue.setBatchTaskId(item.getBatchTaskId());
        issue.setBatchTaskItemId(item.getBatchTaskItemId());
        issue.setZoneLocationId(item.getLocationId());

        return issue;
    }
}
