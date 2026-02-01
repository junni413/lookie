package lookie.backend.domain.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lookie.backend.domain.user.vo.UserRole;
import lookie.backend.domain.user.vo.UserVO;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileResponse {
    private String name;
    private String phoneNumber;
    private LocalDate birthDate;
    private String email;
    private UserRole role;

    /**
     * UserVO로부터 UserProfileResponse 생성 (정적 팩토리 메서드)
     */
    public static UserProfileResponse from(UserVO userVO) {
        return UserProfileResponse.builder()
                .name(userVO.getName())
                .phoneNumber(userVO.getPhoneNumber())
                .birthDate(userVO.getBirthDate())
                .email(userVO.getEmail())
                .role(userVO.getRole())
                .build();
    }
}
