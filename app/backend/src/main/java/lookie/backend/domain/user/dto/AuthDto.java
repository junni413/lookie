package lookie.backend.domain.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lookie.backend.domain.user.vo.UserRole;
import lookie.backend.domain.user.vo.UserVO;

import java.time.LocalDate;

/**
 * Authentication & Session Management DTOs
 * Consolidates all authentication-related request/response objects
 */
public class AuthDto {

    /**
     * 로그인 요청 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        private String phoneNumber;
        private String password;
    }

    /**
     * 로그인 응답 DTO
     * - passwordHash를 제외한 안전한 사용자 정보만 반환
     * - JWT Access Token 및 Refresh Token 포함
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LoginResponse {
        private Long userId;
        private String name;
        private String phoneNumber;
        private String email;
        private LocalDate birthDate;
        private UserRole role;
        private Boolean isActive;

        // JWT 토큰 필드
        private String accessToken;
        private String refreshToken;

        /**
         * UserVO와 JWT 토큰을 LoginResponse로 변환 (비밀번호 해시 제외)
         * 
         * @param user         사용자 정보
         * @param accessToken  JWT Access Token (1시간 유효)
         * @param refreshToken JWT Refresh Token (14일 유효)
         */
        public static LoginResponse from(UserVO user, String accessToken, String refreshToken) {
            return LoginResponse.builder()
                    .userId(user.getUserId())
                    .name(user.getName())
                    .phoneNumber(user.getPhoneNumber())
                    .email(user.getEmail())
                    .birthDate(user.getBirthDate())
                    .role(user.getRole())
                    .isActive(user.getIsActive())
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .build();
        }
    }

    /**
     * 토큰 재발급 응답 DTO
     * - 새로 발급된 Access Token과 Refresh Token을 반환
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TokenResponse {
        private String accessToken;
        private String refreshToken;
    }

    /**
     * 비밀번호 재설정 OTP 요청 DTO
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasswordResetOtpRequest {
        private String email;
    }

    /**
     * 비밀번호 재설정 OTP 검증 요청 DTO
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasswordResetOtpVerifyRequest {
        private String email;
        private String code;
    }

    /**
     * 비밀번호 재설정 확인 요청 DTO
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasswordResetConfirmRequest {
        private String resetToken;
        private String newPassword;
        private String confirmPassword;
    }

    /**
     * 비밀번호 재설정 토큰 응답 DTO
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PasswordResetTokenResponse {
        private String resetToken;
    }
}
