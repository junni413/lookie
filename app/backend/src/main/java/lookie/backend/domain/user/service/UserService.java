package lookie.backend.domain.user.service;

import lombok.RequiredArgsConstructor;
import lookie.backend.domain.user.exception.AlreadyExistsEmailException;
import lookie.backend.domain.user.exception.AlreadyExistsPhoneException;
import lookie.backend.domain.user.exception.EmailVerifyRequiredException;
import lookie.backend.domain.user.exception.InvalidEmailFormatException;
import lookie.backend.domain.user.exception.InvalidPasswordFormatException;
import lookie.backend.domain.user.exception.InvalidPhoneFormatException;
import lookie.backend.domain.user.exception.LoginFailedException;
import lookie.backend.domain.user.mapper.UserMapper;
import lookie.backend.domain.user.vo.UserRole;
import lookie.backend.domain.user.vo.UserVO;
import lookie.backend.global.security.JwtProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final JwtProvider jwtProvider;
    private final StringRedisTemplate redisTemplate;

    // Refresh Token TTL (환경변수에서 주입, 기본값: 14일)
    @Value("${jwt.refresh-expiration}")
    private long refreshTokenTtl;

    // 이메일 형식 검증 정규표현식
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");
    // 전화번호 형식 검증 정규표현식 (하이픈 없이 010으로 시작하는 11자리)
    private static final Pattern PHONE_PATTERN = Pattern.compile("^010\\d{8}$");
    // 비밀번호 형식 검증 정규표현식 (7~15자, 영문+숫자 필수, 특수문자 선택)
    private static final Pattern PASSWORD_PATTERN = Pattern
            .compile("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*#?&]{7,15}$");

    /**
     * 회원가입 비즈니스 로직
     * - 이메일, 전화번호, 비밀번호 형식 검증
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
        // 0-1. 이메일 형식 검증
        if (!isValidEmail(userVO.getEmail())) {
            throw new InvalidEmailFormatException(userVO.getEmail());
        }

        // 0-2. 전화번호 형식 검증 (하이픈 없이 숫자만 11자리)
        if (!isValidPhoneNumber(userVO.getPhoneNumber())) {
            throw new InvalidPhoneFormatException(userVO.getPhoneNumber());
        }

        // 0-3. 이메일 인증 완료 여부 확인 (Redis 플래그 체크)
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

        // 3. 비밀번호 형식 검증 (7~15자, 영문+숫자 필수)
        if (!isValidPassword(plainPassword)) {
            throw new InvalidPasswordFormatException("비밀번호는 7~15자의 영문, 숫자 조합이어야 합니다");
        }

        // 4. 비밀번호 암호화 (BCrypt)
        String encryptedPassword = passwordEncoder.encode(plainPassword);
        userVO.setPasswordHash(encryptedPassword);

        // 5. 기본 권한 설정 (명세서 기준 가입은 WORKER)
        if (userVO.getRole() == null) {
            userVO.setRole(UserRole.WORKER);
        }

        // 6. DB 저장 (MyBatis가 생성된 userId를 userVO에 자동 채움)
        userMapper.insertUser(userVO);

        // 7. 회원가입 완료 후 Redis 데이터 정리
        mailService.clearEmailVerification(userVO.getEmail());
    }

    /**
     * 로그인 비즈니스 로직
     * - 전화번호로 사용자 조회
     * - 비밀번호 검증
     * - 계정 활성화 상태 확인
     * - JWT 토큰 생성 (Access Token + Refresh Token)
     * - Refresh Token을 Redis에 저장 (TTL: 14일)
     * 
     * @param phoneNumber 사용자 전화번호
     * @param rawPassword 평문 비밀번호
     * @return Map {"user": UserVO, "accessToken": String, "refreshToken": String}
     */
    @Transactional(readOnly = true)
    public Map<String, Object> login(String phoneNumber, String rawPassword) {
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

        // 4. JWT 토큰 생성
        String userId = user.getUserId().toString();
        String accessToken = jwtProvider.createAccessToken(userId, user.getRole().name());
        String refreshToken = jwtProvider.createRefreshToken(userId);

        // 5. Refresh Token을 Redis에 저장 (Key: refresh:{userId}, TTL: 14일)
        String redisKey = "refresh:" + userId;
        redisTemplate.opsForValue().set(
                redisKey,
                refreshToken,
                refreshTokenTtl,
                TimeUnit.MILLISECONDS);

        // 6. 사용자 정보와 토큰을 함께 반환
        Map<String, Object> result = new HashMap<>();
        result.put("user", user);
        result.put("accessToken", accessToken);
        result.put("refreshToken", refreshToken);

        return result;
    }

    /**
     * 로그아웃 비즈니스 로직
     * - Refresh Token 삭제 (Redis에서 refresh:{userId} 제거)
     * - Access Token 블랙리스트 등록 (Redis에 blacklist:{accessToken} 추가, TTL: 남은 시간)
     * 
     * @param accessToken 현재 사용 중인 Access Token
     * @param userId      사용자 ID
     */
    @Transactional
    public void logout(String accessToken, String userId) {
        // 1. Refresh Token 삭제 (Redis에서 refresh:{userId} 키 제거)
        String refreshKey = "refresh:" + userId;
        redisTemplate.delete(refreshKey);

        // 2. Access Token 블랙리스트 등록
        // - 남은 유효 시간 동안만 블랙리스트에 보관 (메모리 효율)
        long remainingTime = jwtProvider.getRemainingTime(accessToken);

        if (remainingTime > 0) {
            String blacklistKey = "blacklist:" + accessToken;
            redisTemplate.opsForValue().set(
                    blacklistKey,
                    "logout",
                    remainingTime,
                    TimeUnit.MILLISECONDS);
        }
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

    /**
     * 이메일 형식 검증
     * 
     * @param email 검증할 이메일
     * @return 유효하면 true, 아니면 false
     */
    private boolean isValidEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        return EMAIL_PATTERN.matcher(email).matches();
    }

    /**
     * 전화번호 형식 검증 (하이픈 없이 010으로 시작하는 11자리)
     * 
     * @param phoneNumber 검증할 전화번호
     * @return 유효하면 true, 아니면 false
     */
    private boolean isValidPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            return false;
        }
        return PHONE_PATTERN.matcher(phoneNumber).matches();
    }

    /**
     * 비밀번호 형식 검증 (7~15자, 영문+숫자 필수, 특수문자 선택)
     * 
     * @param password 검증할 비밀번호
     * @return 유효하면 true, 아니면 false
     */
    private boolean isValidPassword(String password) {
        if (password == null || password.trim().isEmpty()) {
            return false;
        }
        return PASSWORD_PATTERN.matcher(password).matches();
    }
}