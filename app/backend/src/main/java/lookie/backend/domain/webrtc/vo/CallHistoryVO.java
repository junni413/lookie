package lookie.backend.domain.webrtc.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Getter
@Setter // 서비스 계층에서 데이터를 수정할 수 있도록 Setter 추가
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CallHistoryVO {

    private Long id;                  // PK
    private String openViduSessionId; // 오픈비두 세션 ID
    private Long callerId;            // 거는 사람
    private Long calleeId;            // 받는 사람
    private Long issueId;             // 이슈 ID (Nullable 가능)
    private String status;            // 상태 (WAITING, ACTIVE, ENDED, REJECTED, CANCELED, NO_ANSWER)
    private LocalDateTime startTime;  // 통화 시작 시간
    private LocalDateTime endTime;    // 통화 종료 시간
    private LocalDateTime createdAt;  // 생성일

    // 기존의 updateStatus 메서드 삭제 (Service Layer에서 setStatus, setStartTime 등을 직접 호출하여 처리)
}