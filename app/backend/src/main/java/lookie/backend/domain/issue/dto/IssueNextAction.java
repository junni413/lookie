package lookie.backend.domain.issue.dto;

/**
 * Issue 처리 후 작업자에게 권고하는 다음 행동
 * - Task 도메인의 상태(TaskActionStatus)와 분리된 UI 권고값
 * - 프론트엔드는 이 값을 보고 적절한 Task API를 호출
 * - 분기표(flow_chart.txt)의 IssueNextAction 컬럼 기준
 */
public enum IssueNextAction {

    /**
     * 다음 상품 집품 계속
     * - 서버 추가 동작 없음
     * - 프론트는 스캔 화면으로 복귀
     */
    NEXT_ITEM,

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
     * 재촬영 대기 (AI 결과 = RETAKE)
     * - 작업자가 이미지 재촬영 필요
     * - 재촬영 전까지 진행 불가
     * - 관리자 개입 없음
     */
    WAIT_RETAKE,

    /**
     * 보고용 이미지 등록 대기 (AI 결과 X)
     * - OUT_OF_STOCK 신고 + 관리자 부재 시
     */
    WAIT_REPORT_IMAGE,

    /**
     * 자동 해결됨 (관리자 확정 완료)
     * - 결과 표시만
     * - 작업 계속 진행
     */
    AUTO_RESOLVED
}
