package lookie.backend.domain.issue.dto;

/**
 * 관리자 다음 행동 지시
 * 분기표(flow_chart.txt)의 AdminNextAction 컬럼 기준
 */
public enum AdminNextAction {

    /**
     * 사후 확정 필요
     * - 작업자는 계속 진행
     * - 관리자는 나중에 확정
     */
    ADMIN_CONFIRM_LATER,

    /**
     * 통화 참여 필요
     * - 작업자가 CONNECT_ADMIN 선택 시
     * - 또는 NEED_CHECK로 자동 BLOCKING된 경우
     */
    ADMIN_JOIN_CALL,

    /**
     * 즉시 확정 필요
     * - WebRTC CONNECTED 후
     * - 관리자가 확정 버튼 클릭해야 함
     */
    ADMIN_CONFIRM_NOW,

    /**
     * 재시도 또는 확정
     * - WebRTC MISSED 후
     * - 재연결 시도 또는 사후 확정 선택
     */
    ADMIN_RETRY_OR_CONFIRM,

    /**
     * 재촬영 지시
     * - AI 결과가 RETAKE인 경우
     * - 관리자 개입 없이 작업자가 재촬영
     */
    RETAKE_IMAGE
}
