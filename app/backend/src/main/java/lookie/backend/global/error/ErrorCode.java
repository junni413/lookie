package lookie.backend.global.error;

import org.springframework.http.HttpStatus;

/**
 * 프론트엔드와 협의된 에러 코드 집합 
 * 프론트가 화면/플로우를 변경해야 하는 경우에 정의
 */
public enum ErrorCode {

	// AUTH
	AUTH_001(HttpStatus.UNAUTHORIZED, "로그인 실패"), 
	AUTH_002(HttpStatus.UNAUTHORIZED, "인증이 필요합니다"),

	// TASK
	TASK_001(HttpStatus.CONFLICT, "이미 할당된 작업입니다"), 
	TASK_002(HttpStatus.CONFLICT, "이미 완료된 작업입니다"),

	// ISSUE
	ISSUE_001(HttpStatus.BAD_REQUEST, "재촬영이 필요합니다");

	private final HttpStatus status;
	private final String defaultMessage;

	ErrorCode(HttpStatus status, String defaultMessage) {
		this.status = status;
		this.defaultMessage = defaultMessage;
	}

	public HttpStatus getStatus() {
		return status;
	}

	public String getDefaultMessage() {
		return defaultMessage;
	}
}
