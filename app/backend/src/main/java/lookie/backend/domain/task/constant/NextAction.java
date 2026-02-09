package lookie.backend.domain.task.constant;

/**
 * 프론트엔드 작업 흐름 제어를 위한 다음 행동 지시어
 */
public enum NextAction {
    SCAN_TOTE, // 토트 스캔 필요
    SCAN_LOCATION, // 지번 스캔 필요
    SCAN_ITEM, // 상품 스캔 필요
    ADJUST_QUANTITY, // 수량 조정 중
    NEXT_ITEM, // 다음 상품 스캔 필요 (현재 지번 내)
    COMPLETE_TASK, // 모든 작업 완료 가능
    UPLOAD_IMAGE, // 이슈 발생 시 이미지 업로드 필요
    AI_JUDGING, // AI 판정 대기 중
    SHOW_AI_RESULT, // AI 판정 결과 확인 필요
    WAIT_ADMIN, // 관리자 승인 대기
    NONE // 대기 상태 또는 종료
}
