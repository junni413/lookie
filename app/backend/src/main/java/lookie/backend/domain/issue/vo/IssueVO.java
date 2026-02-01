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
    private String priority; // ENUM('LOW','MEDIUM','HIGH')
    private String reasonCode; // ENUM('DAMAGED','MOVE_LOCATION','WAITING_RETURN','STOCK_EXISTS','UNKNOWN')
    private String issueHandling; // ENUM('BLOCKING','NON_BLOCKING')
    private Boolean adminRequired;

    private Long workerId;
    private Long adminId;
    private Long batchTaskId;
    private Long batchTaskItemId;
    private Long zoneLocationId;

    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private String note;

    /**
     * 이슈 초기 생성
     */
    public static IssueVO createInitial(Long workerId, TaskItemVO item) {
        IssueVO issue = new IssueVO();

        // 기본 정책 (Issue Core 설계 문서 기준)
        issue.setIssueType("DAMAGED"); // 기본값: 파손
        issue.setStatus("OPEN"); // 상태: 열림
        issue.setPriority("MEDIUM"); // 우선순위: 중간
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
