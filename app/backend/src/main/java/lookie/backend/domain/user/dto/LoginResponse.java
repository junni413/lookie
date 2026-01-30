package lookie.backend.domain.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lookie.backend.domain.user.vo.UserRole;
import lookie.backend.domain.user.vo.UserVO;

import java.time.LocalDate;

/**
 * 로그인 응답 DTO
 * - passwordHash를 제외한 안전한 사용자 정보만 반환
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {
    private Long userId;
    private String name;
    private String phoneNumber;
    private String email;
    private LocalDate birthDate;
    private UserRole role;
    private Boolean isActive;

    /**
     * UserVO를 LoginResponse로 변환 (비밀번호 해시 제외)
     */
    public static LoginResponse from(UserVO user) {
        return LoginResponse.builder()
                .userId(user.getUserId())
                .name(user.getName())
                .phoneNumber(user.getPhoneNumber())
                .email(user.getEmail())
                .birthDate(user.getBirthDate())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .build();
    }
}
