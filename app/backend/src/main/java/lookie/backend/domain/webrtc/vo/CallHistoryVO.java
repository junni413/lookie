package lookie.backend.domain.webrtc.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CallHistoryVO {

    private Long id;                  // PK
    private String openViduSessionId; // 오픈비두 세션 ID
    private Long callerId;            // 거는 사람
    private Long calleeId;            // 받는 사람
    private Long issueId;             // 이슈 ID
    private String status;            // 상태 (ENUM 대신 String으로 저장 추천, 혹은 TypeHandler 사용)
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime createdAt;  // 생성일

    // 상태 변경 메서드 (비즈니스 로직용)
    public void updateStatus(String status) {
        this.status = status;
        if ("ACTIVE".equals(status)) this.startTime = LocalDateTime.now();
        if ("ENDED".equals(status)) this.endTime = LocalDateTime.now();
    }
}