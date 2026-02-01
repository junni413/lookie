package lookie.backend.global.error;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 프론트엔드와 협의된 에러 코드 집합
 * 프론트가 화면/플로우를 변경해야 하는 경우에 정의
 */
@Getter
public enum ErrorCode {

	// ===== AUTH =====
	AUTH_LOGIN_FAILED("AUTH_001", HttpStatus.UNAUTHORIZED, "로그인 실패"),
	AUTH_REQUIRED("AUTH_002", HttpStatus.UNAUTHORIZED, "인증이 필요합니다"),
	AUTH_INVALID_TOKEN("AUTH_003", HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다"),
	AUTH_EXPIRED_TOKEN("AUTH_004", HttpStatus.UNAUTHORIZED, "만료된 토큰입니다"),
	AUTH_EMAIL_ALREADY_SENT("AUTH_005", HttpStatus.TOO_MANY_REQUESTS, "1분 내 재발송이 제한됩니다"),
	AUTH_EMAIL_VERIFY_REQUIRED("AUTH_006", HttpStatus.FORBIDDEN, "이메일 인증이 필요합니다"),
	AUTH_EMAIL_CODE_EXPIRED("AUTH_007", HttpStatus.BAD_REQUEST, "인증번호가 만료되었거나 일치하지 않습니다"),
	AUTH_LOGOUT_TOKEN("AUTH_008", HttpStatus.UNAUTHORIZED, "이미 로그아웃된 토큰입니다. 다시 로그인해주세요."),
	AUTH_EMAIL_CHANGE_TOKEN_REQUIRED("AUTH_009", HttpStatus.FORBIDDEN, "이메일 변경 인증이 필요합니다"),

	// ===== EMAIL =====
	EMAIL_SEND_FAILED("EMAIL_001", HttpStatus.SERVICE_UNAVAILABLE, "이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요"),

	// ===== USER =====
	USER_ALREADY_EXISTS_PHONE("USER_001", HttpStatus.CONFLICT, "이미 가입된 전화번호입니다"),
	USER_ALREADY_EXISTS_EMAIL("USER_002", HttpStatus.CONFLICT, "이미 가입된 이메일입니다"),
	USER_NOT_FOUND("USER_003", HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다"),
	INVALID_EMAIL_FORMAT("USER_004", HttpStatus.BAD_REQUEST, "유효하지 않은 이메일 형식입니다"),
	INVALID_PHONE_FORMAT("USER_005", HttpStatus.BAD_REQUEST, "유효하지 않은 전화번호 형식입니다"),
	INVALID_PASSWORD_FORMAT("USER_006", HttpStatus.BAD_REQUEST, "비밀번호는 7~15자의 영문, 숫자 조합이어야 합니다"),
	USER_DELETED("USER_007", HttpStatus.FORBIDDEN, "탈퇴한 계정입니다"),
	USER_INVALID_PASSWORD("USER_008", HttpStatus.UNAUTHORIZED, "비밀번호가 일치하지 않습니다"),

	// ===== TASK =====
	TASK_ALREADY_ASSIGNED("TASK_001", HttpStatus.CONFLICT, "이미 할당된 작업입니다"),
	TASK_ALREADY_COMPLETED("TASK_002", HttpStatus.CONFLICT, "이미 완료된 작업입니다"),

	TASK_NOT_FOUND("TASK_003", HttpStatus.NOT_FOUND, "작업을 찾을 수 없습니다"),
	TASK_NO_AVAILABLE("TASK_004", HttpStatus.CONFLICT, "할당 가능한 작업이 없습니다"),
	TASK_INVALID_STATE("TASK_005", HttpStatus.CONFLICT, "작업 상태 전이가 올바르지 않습니다"),
	TASK_TOTE_MISMATCH("TASK_006", HttpStatus.BAD_REQUEST, "토트 바코드가 일치하지 않습니다"),
	TASK_LOCATION_MISMATCH("TASK_007", HttpStatus.BAD_REQUEST, "지시된 지번과 일치하지 않습니다"),
	TASK_NOT_RELEASABLE("TASK_009", HttpStatus.BAD_REQUEST, "미완료된 아이템이 있어 작업을 완료할 수 없습니다"),
	WORKER_ALREADY_HAS_TASK("TASK_010", HttpStatus.CONFLICT, "이미 진행 중인 작업이 있습니다"),
	TASK_ITEM_QUANTITY_EXCEEDED("TASK_011", HttpStatus.BAD_REQUEST, "요구 수량을 초과하여 집품할 수 없습니다"),
	TASK_ITEM_QUANTITY_NOT_SUFFICIENT("TASK_012", HttpStatus.BAD_REQUEST, "요구 수량을 모두 채워야 완료할 수 있습니다"),
	TASK_ITEM_NOT_ASSIGNED("TASK_013", HttpStatus.BAD_REQUEST, "현재 작업에 할당된 상품이 아닙니다"),

	// ==== LOCATION ====
	LOCATION_NOT_FOUND("LOC_001", HttpStatus.NOT_FOUND, "존재하지 않는 지번 코드입니다"),
	LOCATION_ZONE_MISMATCH("LOC_002", HttpStatus.BAD_REQUEST, "현재 작업 구역과 일치하지 않는 지번입니다"),

	// ==== ZONE ====
	WORKER_ZONE_NOT_ASSIGNED("ZONE_001", HttpStatus.BAD_REQUEST, "작업자에게 배정된 작업 구역이 없습니다"),

	// ==== TOTE ====
	TOTE_ALREADY_IN_USE("TOTE_001", HttpStatus.CONFLICT, "이미 다른 작업에 사용 중인 토트입니다"),

	// ===== ISSUE =====
	ISSUE_RECAPTURE_REQUIRED("ISSUE_001", HttpStatus.BAD_REQUEST, "재촬영이 필요합니다"),
	ISSUE_ITEM_NOT_FOUND("ISSUE_002", HttpStatus.NOT_FOUND, "작업 아이템을 찾을 수 없습니다"),
	ISSUE_TASK_NOT_ASSIGNED("ISSUE_003", HttpStatus.FORBIDDEN, "해당 작업이 현재 작업자에게 할당되지 않았습니다"),
	ISSUE_NOT_FOUND("ISSUE_004", HttpStatus.NOT_FOUND, "이슈를 찾을 수 없습니다"),

	// ==== PRODUCT ====
	PRODUCT_NOT_FOUND("PROD_001", HttpStatus.NOT_FOUND, "상품 정보를 찾을 수 없습니다"),

	// ===== WEBRTC (OpenVidu) =====
	WEBRTC_SESSION_NOT_FOUND("RTC_001", HttpStatus.NOT_FOUND, "존재하지 않거나 이미 종료된 세션입니다"),
	WEBRTC_MANAGER_BUSY("RTC_002", HttpStatus.CONFLICT, "관리자가 현재 부재중입니다"),
	WEBRTC_SERVER_ERROR("RTC_003", HttpStatus.INTERNAL_SERVER_ERROR, "OpenVidu 서버와 통신 중 오류가 발생했습니다"),
	WEBRTC_CLIENT_ERROR("RTC_004", HttpStatus.BAD_REQUEST, "잘못된 WebRTC 요청입니다"),
	WEBRTC_USER_AWAY("RTC_005", HttpStatus.CONFLICT, "상대방이 자리 비움 상태입니다"),
	WEBRTC_USER_PAUSED("RTC_006", HttpStatus.CONFLICT, "상대방이 작업 중지 상태입니다"),
	// ==== SYSTEM =====
	SYSTEM_TEMPORARY_LOCK_FAILED("SYS_001", HttpStatus.TOO_MANY_REQUESTS, "요청이 많아 잠시 후 다시 시도해주세요");

	private final String code; // 프론트 노출용
	private final HttpStatus status;
	private final String defaultMessage;

	ErrorCode(String code, HttpStatus status, String defaultMessage) {
		this.code = code;
		this.status = status;
		this.defaultMessage = defaultMessage;
	}

}
