package lookie.backend.global.error;

import io.openvidu.java.client.OpenViduHttpException;
import io.openvidu.java.client.OpenViduJavaClientException;
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
				errorCode
		);

		return ResponseEntity
				.status(errorCode.getStatus())
				.body(response);
	}

	// [추가] OpenVidu 서버 통신 에러 (Http Status가 넘어오는 경우)
	@ExceptionHandler(OpenViduHttpException.class)
	public ResponseEntity<ApiResponse<Void>> handleOpenViduHttpException(OpenViduHttpException e) {
		log.error("[OpenVidu Http Error] Status: {}, Message: {}", e.getStatus(), e.getMessage());

		// 404인 경우 세션 없음 처리
		if (e.getStatus() == 404) {
			return handleApiException(new ApiException(ErrorCode.WEBRTC_SESSION_NOT_FOUND));
		}

		// 그 외는 서버 에러로 처리
		return handleApiException(new ApiException(ErrorCode.WEBRTC_SERVER_ERROR));
	}

	// [추가] OpenVidu 자바 클라이언트 내부 에러
	@ExceptionHandler(OpenViduJavaClientException.class)
	public ResponseEntity<ApiResponse<Void>> handleOpenViduJavaClientException(OpenViduJavaClientException e) {
		log.error("[OpenVidu Client Error] ", e);
		return handleApiException(new ApiException(ErrorCode.WEBRTC_CLIENT_ERROR));
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
