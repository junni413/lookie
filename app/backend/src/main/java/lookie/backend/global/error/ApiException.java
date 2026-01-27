package lookie.backend.global.error;

/**
 * 비즈니스 로직에서 사용하는 공통 API 예외
 * 서비스/도메인 계층에서는 응답을 만들지 않음
 */
public class ApiException extends RuntimeException{
	private final ErrorCode errorCode;
	
	public ApiException(ErrorCode errorCode) {
		super(errorCode != null ? errorCode.getDefaultMessage() : null);
		this.errorCode = errorCode;
	}
	
	public ApiException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
	
	public ErrorCode getErrorCode() {
		return errorCode;
	}
	
}
