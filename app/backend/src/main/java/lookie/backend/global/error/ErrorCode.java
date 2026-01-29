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

	// ===== USER =====
	USER_ALREADY_EXISTS_PHONE("USER_001", HttpStatus.CONFLICT, "이미 가입된 전화번호입니다"),
	USER_ALREADY_EXISTS_EMAIL("USER_002", HttpStatus.CONFLICT, "이미 가입된 이메일입니다"),
	USER_NOT_FOUND("USER_003", HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다"),

	// ===== TASK =====
	TASK_ALREADY_ASSIGNED("TASK_001", HttpStatus.CONFLICT, "이미 할당된 작업입니다"),
	TASK_ALREADY_COMPLETED("TASK_002", HttpStatus.CONFLICT, "이미 완료된 작업입니다"),

	TASK_NOT_FOUND("TASK_003", HttpStatus.NOT_FOUND, "작업을 찾을 수 없습니다"),
	TASK_NO_AVAILABLE("TASK_004", HttpStatus.CONFLICT, "할당 가능한 작업이 없습니다"),
	TASK_INVALID_STATE("TASK_005", HttpStatus.CONFLICT, "작업 상태 전이가 올바르지 않습니다"),

	// ==== ZONE ====
	WORKER_ZONE_NOT_ASSIGNED("ZONE_001", HttpStatus.BAD_REQUEST, "작업자에게 배정된 작업 구역이 없습니다"),

	// ===== ISSUE =====
	ISSUE_RECAPTURE_REQUIRED("ISSUE_001", HttpStatus.BAD_REQUEST, "재촬영이 필요합니다"),

	// ==== SYSTEM =====
	SYSTEM_TEMPORARY_LOCK_FAILED("SYS_001",HttpStatus.TOO_MANY_REQUESTS,"요청이 많아 잠시 후 다시 시도해주세요");

	private final String code; // 프론트 노출용
	private final HttpStatus status;
	private final String defaultMessage;

	ErrorCode(String code, HttpStatus status, String defaultMessage) {
		this.code = code;
		this.status = status;
		this.defaultMessage = defaultMessage;
	}

}
