package lookie.backend.global.error;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import lookie.backend.global.response.ApiResponse;

/**
 * 전역 예외 처리 핸들러
 * 모든 ApiException 및 예상치 못한 예외를 공통 ApiResponse 형태로 변환
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	// 비즈니스 예외 처리 (서비스 단에서 던진 ApiException)
	@ExceptionHandler(ApiException.class)
	public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException e) {
		ErrorCode errorCode = e.getErrorCode();
		
		HttpStatus status = (errorCode != null) ? errorCode.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
		
		ApiResponse<Void> response = ApiResponse.fail(e.getMessage(), e.getErrorCode());
		return ResponseEntity.status(status).body(response);
	}

	// 예상치 못한 서버 오류 처리
	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
		ApiResponse<Void> response = ApiResponse.fail("서버 오류가 발생했습니다", null);

		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
	}
}
