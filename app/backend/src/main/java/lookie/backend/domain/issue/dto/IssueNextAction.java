package lookie.backend.domain.issue.dto;

/**
 * Issue 처리 후 작업자에게 권고하는 다음 행동
 * - Task 도메인의 상태(TaskActionStatus)와 분리된 UI 권고값
 * - 프론트엔드는 이 값을 보고 적절한 Task API를 호출
 */
public enum IssueNextAction {

    /**
     * 다음 상품 집품 계속
     * - 서버 추가 동작 없음
     * - 프론트는 스캔 화면으로 복귀
     */
    CONTINUE_PICKING,

    /**
     * 지번 이동 필요 (OUT_OF_STOCK + MOVE_LOCATION)
     * - 프론트는 지번 스캔 화면으로 전환
     * - Task API: POST /tasks/{taskId}/locations/check 호출
     */
    MOVE_LOCATION,

    /**
     * 관리자 판단 대기 (BLOCKING)
     * - WebRTC 연결 필수 시도
     * - UI에서 스캔 버튼 비활성화
     */
    WAIT_ADMIN,

    /**
     * 자동 해결됨 (PASS)
     * - 결과 표시만
     * - 작업 계속 진행
     */
    AUTO_RESOLVED
}
