package lookie.backend.domain.issue.dto;

/**
 * 작업자 다음 행동 지시
 * 분기표(flow_chart.txt)의 WorkerNextAction 컬럼 기준
 */
public enum WorkerNextAction {

    /**
     * 집품 계속 진행
     * - 다음 상품 스캔 또는 현재 작업 계속
     */
    CONTINUE_PICKING,

    /**
     * 관리자 대기
     * - WebRTC 연결 대기 또는 관리자 처리 대기
     * - UI에서 스캔 버튼 비활성화
     */
    WAIT_ADMIN,

    /**
     * 이미지 재촬영
     * - AI 결과가 RETAKE인 경우
     * - 재촬영 후 AI 재요청
     */
    UPLOAD_IMAGE,

    /**
     * 지번 이동
     * - OUT_OF_STOCK + MOVE_LOCATION 케이스
     * - 새 지번으로 이동 후 작업 재개
     */
    MOVE_LOCATION
}
