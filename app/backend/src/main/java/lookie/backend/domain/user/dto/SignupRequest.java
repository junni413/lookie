package lookie.backend.domain.user.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * 회원가입 요청 DTO
 * - password 필드로 평문 비밀번호를 받아 Service에서 암호화 처리
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SignupRequest {
    private String phoneNumber;
    private String password; // 평문 비밀번호 (Service에서 암호화)
    private String name;
    private String email;
    private LocalDate birthDate;
}
