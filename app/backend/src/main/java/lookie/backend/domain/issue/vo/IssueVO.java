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
    private String reasonCode; // ENUM('DAMAGED','MOVE_LOCATION','WAITING_RETURN','STOCK_EXISTS','UNKNOWN')
    private String issueHandling; // ENUM('BLOCKING','NON_BLOCKING')
    private Boolean adminRequired;

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
     * 이슈 초기 생성
     * 분기표 D0/S0 노드 기준
     */
    public static IssueVO createInitial(Long workerId, TaskItemVO item, String issueType) {
        IssueVO issue = new IssueVO();

        // 기본 정책 (분기표 D0/S0 노드)
        issue.setIssueType(issueType); // 입력받은 유형으로 설정 (DAMAGED 또는 OUT_OF_STOCK)
        issue.setStatus("OPEN"); // 상태: 열림
        issue.setUrgency(3); // 관제 큐 우선순위: 3 (중간)
        issue.setIssueHandling("NON_BLOCKING"); // 처리 방식: 비차단
        issue.setAdminRequired(false); // 관리자 필요: 아니오
        issue.setReasonCode("UNKNOWN"); // 사유 코드: 미확인

        // 연관 데이터
        issue.setWorkerId(workerId);
        issue.setBatchTaskId(item.getBatchTaskId());
        issue.setBatchTaskItemId(item.getBatchTaskItemId());
        issue.setZoneLocationId(item.getLocationId());

        return issue;
    }
}
