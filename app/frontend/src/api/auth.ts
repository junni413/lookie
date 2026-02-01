// src/api/auth.ts
import { request } from "./http";

/**
 * ✅ 백엔드 공통 응답 래퍼 형태에 맞춘 타입
 *  - 실제 응답: { success, message, errorCode, data }
 */
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T | null;
};

/**
 * 백엔드 응답 DTO (data 안에 들어오는 payload)
 */
export interface PasswordResetTokenResponse {
  resetToken: string;
}

/**
 * 1) 비밀번호 재설정 인증번호 발송
 * POST /api/auth/password/reset/otp/request
 * body: { email }
 * res: ApiResponse<null> (현재 data: null)
 */
export async function requestPasswordResetOtp(email: string) {
  return request<ApiResponse<null>>("/api/auth/password/reset/otp/request", {
    method: "POST",
    body: { email },
  });
}

/**
 * 2) 비밀번호 재설정 인증번호 검증
 * POST /api/auth/password/reset/otp/verify
 * body: { email, code }
 * res: ApiResponse<{ resetToken: string }>
 */
export async function verifyPasswordResetOtp(email: string, code: string) {
  return request<ApiResponse<PasswordResetTokenResponse>>(
    "/api/auth/password/reset/otp/verify",
    {
      method: "POST",
      body: {
        email,
        code: String(code),
      },
    }
  );
}

/**
 * 3) 비밀번호 재설정 확정
 * POST /api/auth/password/reset/confirm
 * body: { resetToken, newPassword, confirmPassword }
 * res: ApiResponse<null> (또는 백엔드 스펙에 따라 data 존재 가능)
 */
export async function confirmPasswordReset(
  resetToken: string,
  newPassword: string,
  confirmPassword: string
) {
  return request<ApiResponse<null>>("/api/auth/password/reset/confirm", {
    method: "POST",
    body: {
      resetToken,
      newPassword,
      confirmPassword,
    },
  });
}
