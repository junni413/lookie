package lookie.backend.global.response;

import lombok.Getter;
import lookie.backend.global.error.ErrorCode;

/**
 * 공통 API 응답 래퍼 
 * 성공/실패 응답을 동일한 형태로 내려주기 위한 클래스
 */
@Getter
public class ApiResponse<T> {

	private final boolean success;
	private final String message;
	private final String errorCode;
	private final T data;

	public ApiResponse(boolean success, String message, String errorCode, T data) {
		this.success = success;
		this.message = message;
		this.errorCode = errorCode;
		this.data = data;
	}
	
	// 성공
	public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "성공", null, data);
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, null, data);
    }
    
    // 실패
    public static <T> ApiResponse<T> fail(String message, ErrorCode errorCode) {
        return new ApiResponse<>(
                false,
                message,
                errorCode == null ? null : errorCode.name(),
                null
        );
    }


}
