package lookie.backend.domain.user.vo;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lookie.backend.domain.user.dto.SignupRequest;
import org.apache.ibatis.type.Alias;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Alias("UserVO")
public class UserVO {

    private Long userId;
    private UserRole role;
    private String passwordHash;
    private String name;
    private String phoneNumber;
    private String email;
    private LocalDate birthDate;
    private Boolean isActive;
    private Long assignedZoneId; // 배정된 구역 ID (WebRTC 자동 선택용)
    private String status; // 실시간 가용성 상태 (ONLINE/BUSY/PAUSED/AWAY) - Redis에서 주입
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * SignupRequest로부터 UserVO 생성 (정적 팩토리 메서드)
     * - passwordHash 필드에는 평문 비밀번호가 임시로 담김 (Service에서 암호화)
     * - 기본값: role=WORKER, isActive=true
     */
    public static UserVO from(SignupRequest request) {
        UserVO userVO = new UserVO();
        userVO.setPhoneNumber(request.getPhoneNumber());
        userVO.setPasswordHash(request.getPassword()); // 평문 (Service에서 암호화 필요)
        userVO.setName(request.getName());
        userVO.setEmail(request.getEmail());
        userVO.setBirthDate(request.getBirthDate());
        userVO.setRole(UserRole.WORKER);
        userVO.setIsActive(true);
        return userVO;
    }
}
