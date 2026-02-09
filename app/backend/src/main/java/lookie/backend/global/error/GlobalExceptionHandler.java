package lookie.backend.global.error;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import lookie.backend.global.response.ApiResponse;

/**
 * 전역 예외 처리 핸들러
 * 모든 ApiException 및 예상치 못한 예외를 공통 ApiResponse 형태로 변환
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

	// 비즈니스 예외 처리 (서비스 단에서 던진 ApiException)
	@ExceptionHandler(ApiException.class)
	public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException e) {
		ErrorCode errorCode = e.getErrorCode();

		// [서버 로그] 개발자는 터미널에서 "중복 가입 시도 발견 - phone: 010..."을 확인
		log.error("[ApiException] Code: {}, Detail: {}", errorCode.getCode(), e.getMessage());

		// [클라이언트 응답] 사용자는 화면에서 "이미 가입된 전화번호입니다"만 확인
		ApiResponse<Void> response = ApiResponse.fail(
				errorCode.getDefaultMessage(),
				errorCode);

		return ResponseEntity
				.status(errorCode.getStatus())
				.body(response);
	}

	// 예상치 못한 서버 오류 처리
	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
		// [추가] 어떤 예상치 못한 에러인지 스택트레이스를 포함해 로그를 남깁니다.
		log.error("[Unexpected Error] ", e);

		ApiResponse<Void> response = ApiResponse.fail("서버 오류가 발생했습니다", null);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
	}
}
