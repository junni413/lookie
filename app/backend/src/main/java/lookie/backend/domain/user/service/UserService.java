package lookie.backend.domain.user.service;

import lombok.RequiredArgsConstructor;
import lookie.backend.domain.user.exception.AlreadyExistsEmailException;
import lookie.backend.domain.user.exception.AlreadyExistsPhoneException;
import lookie.backend.domain.user.exception.EmailVerifyRequiredException;
import lookie.backend.domain.user.exception.LoginFailedException;
import lookie.backend.domain.user.mapper.UserMapper;
import lookie.backend.domain.user.vo.UserRole;
import lookie.backend.domain.user.vo.UserVO;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    /**
     * 회원가입 비즈니스 로직
     * - 이메일 인증 완료 확인 (필수)
     * - 전화번호 및 이메일 중복 체크
     * - 비밀번호 암호화
     * - 기본 권한 WORKER 설정
     * 
     * @param userVO        사용자 정보 (비밀번호 제외)
     * @param plainPassword 평문 비밀번호
     */
    @Transactional
    public void signup(UserVO userVO, String plainPassword) {
        // 0. 이메일 인증 완료 여부 확인 (Redis 플래그 체크)
        if (!mailService.isEmailVerified(userVO.getEmail())) {
            throw new EmailVerifyRequiredException(userVO.getEmail());
        }

        // 1. 중복 확인 (전화번호)
        if (userMapper.existByPhoneNumber(userVO.getPhoneNumber())) {
            throw new AlreadyExistsPhoneException(userVO.getPhoneNumber());
        }

        // 2. 중복 확인 (이메일)
        if (userMapper.existByEmail(userVO.getEmail())) {
            throw new AlreadyExistsEmailException(userVO.getEmail());
        }

        // 3. 비밀번호 암호화 (BCrypt)
        String encryptedPassword = passwordEncoder.encode(plainPassword);
        userVO.setPasswordHash(encryptedPassword);

        // 4. 기본 권한 설정 (명세서 기준 가입은 WORKER)
        if (userVO.getRole() == null) {
            userVO.setRole(UserRole.WORKER);
        }

        // 5. DB 저장 (MyBatis가 생성된 userId를 userVO에 자동 채움)
        userMapper.insertUser(userVO);

        // 6. 회원가입 완료 후 Redis 데이터 정리
        mailService.clearEmailVerification(userVO.getEmail());
    }

    /**
     * 로그인 비즈니스 로직
     * - 전화번호로 사용자 조회
     * - 비밀번호 검증
     * - 계정 활성화 상태 확인
     * 
     * @return 로그인 성공한 사용자 정보
     */
    @Transactional(readOnly = true)
    public UserVO login(String phoneNumber, String rawPassword) {
        // 1. 전화번호로 사용자 조회
        UserVO user = userMapper.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new LoginFailedException(phoneNumber));

        // 2. 비밀번호 검증
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new LoginFailedException(phoneNumber);
        }

        // 3. 계정 활성화 상태 확인 (보안: 비활성 계정도 로그인 실패로 통일)
        if (user.getIsActive() == null || !user.getIsActive()) {
            throw new LoginFailedException(phoneNumber);
        }

        return user;
    }

    /**
     * 전화번호 중복 체크 전용 (API용)
     */
    public boolean checkPhoneDuplicate(String phone) {
        return userMapper.existByPhoneNumber(phone);
    }

    /**
     * 이메일 중복 체크 전용 (API용)
     */
    public boolean checkEmailDuplicate(String email) {
        return userMapper.existByEmail(email);
    }
}