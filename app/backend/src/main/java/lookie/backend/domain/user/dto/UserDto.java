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
 * User Profile & Account Management DTOs
 * Consolidates all user-related request/response objects
 */
public class UserDto {

    /**
     * 회원가입 요청 DTO
     * - password 필드로 평문 비밀번호를 받아 Service에서 암호화 처리
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SignupRequest {
        private String phoneNumber;
        private String password; // 평문 비밀번호 (Service에서 암호화)
        private String name;
        private String email;
        private LocalDate birthDate;
    }

    /**
     * 사용자 프로필 응답 DTO
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProfileResponse {
        private String name;
        private String phoneNumber;
        private LocalDate birthDate;
        private String email;
        private UserRole role;

        /**
         * UserVO로부터 ProfileResponse 생성 (정적 팩토리 메서드)
         */
        public static ProfileResponse from(UserVO userVO) {
            return ProfileResponse.builder()
                    .name(userVO.getName())
                    .phoneNumber(userVO.getPhoneNumber())
                    .birthDate(userVO.getBirthDate())
                    .email(userVO.getEmail())
                    .role(userVO.getRole())
                    .build();
        }
    }

    /**
     * 프로필 업데이트 요청 DTO
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateProfileRequest {
        private String name;
        private String email;
        private String password;
        private LocalDate birthDate;
    }

    /**
     * 회원 탈퇴 요청 DTO
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeleteAccountRequest {
        private String password;
    }

    /**
     * 이메일 인증번호 발송 요청 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmailSendRequest {
        private String email;
    }

    /**
     * 이메일 인증번호 검증 요청 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmailVerifyRequest {
        private String email;
        private String code;
    }

    /**
     * 이메일 변경 OTP 요청 DTO
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmailChangeOtpRequest {
        private String newEmail;
    }

    /**
     * 이메일 변경 OTP 검증 요청 DTO
     */
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmailChangeOtpVerifyRequest {
        private String newEmail;
        private String code;
    }
}
