package lookie.backend.domain.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.user.exception.AlreadyExistsEmailException;
import lookie.backend.domain.user.exception.AlreadyExistsPhoneException;
import lookie.backend.domain.user.exception.EmailVerifyRequiredException;
import lookie.backend.domain.user.exception.InvalidEmailFormatException;
import lookie.backend.domain.user.exception.InvalidPasswordException;
import lookie.backend.domain.user.exception.InvalidPasswordFormatException;
import lookie.backend.domain.user.exception.InvalidPhoneFormatException;
import lookie.backend.domain.user.exception.InvalidTokenException;
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

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Slf4j
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
        // 1. 전화번호로 사용자 조회 (is_active 필터링 없이 조회하여 탈퇴 여부 확인)
        UserVO user = userMapper.findByPhoneNumberIncludingDeleted(phoneNumber)
                .orElseThrow(() -> new LoginFailedException(phoneNumber));

        // 2. 비밀번호 검증
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new LoginFailedException(phoneNumber);
        }

        // 3. 계정 활성화 상태 확인 (탈퇴한 계정은 명시적 에러 반환)
        if (user.getIsActive() == null || !user.getIsActive()) {
            throw new lookie.backend.domain.user.exception.DeletedUserException();
        }

        // 4. JWT 토큰 생성
        String userId = user.getUserId().toString();
        String accessToken = jwtProvider.createAccessToken(userId, user.getRole().name());
        String refreshToken = jwtProvider.createRefreshToken(userId);

        // 5. Refresh Token을 암호화하여 Redis에 저장 (Key: refresh:{userId}, TTL: 14일)
        // 보안: Redis가 탈취되어도 원본 토큰 노출 방지
        String redisKey = "refresh:" + userId;
        String hashedRefreshToken = passwordEncoder.encode(refreshToken);
        redisTemplate.opsForValue().set(
                redisKey,
                hashedRefreshToken,
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
     * 토큰 재발급 비즈니스 로직 (RTR 방식)
     * - Refresh Token Rotation: 재발급 시마다 새로운 Refresh Token 생성
     * - 보안 강화: 기존 Refresh Token 무효화 및 새 토큰으로 교체
     * 
     * @param refreshToken 클라이언트가 보낸 Refresh Token
     * @return Map {\"accessToken\": String, \"refreshToken\": String}
     */
    @Transactional
    public Map<String, String> reissueToken(String refreshToken) {
        // 1. Refresh Token 유효성 검증
        if (!jwtProvider.validateToken(refreshToken)) {
            throw new InvalidTokenException("유효하지 않은 Refresh Token입니다.");
        }

        // 2. Refresh Token에서 사용자 ID 추출
        String userId = jwtProvider.getUserId(refreshToken);

        // 3. Redis에 저장된 암호화된 Refresh Token과 비교
        String redisKey = "refresh:" + userId;
        String hashedStoredToken = redisTemplate.opsForValue().get(redisKey);

        if (hashedStoredToken == null) {
            throw new InvalidTokenException("저장된 Refresh Token이 없습니다. 다시 로그인해주세요.");
        }

        // 보안: BCrypt를 사용하여 원본 토큰과 해시 비교
        if (!passwordEncoder.matches(refreshToken, hashedStoredToken)) {
            throw new InvalidTokenException("Refresh Token이 일치하지 않습니다. 다시 로그인해주세요.");
        }

        // 4. RTR 적용: 기존 Refresh Token 삭제
        redisTemplate.delete(redisKey);

        // 5. 사용자 정보 조회 (Role 정보 필요)
        UserVO user = userMapper.findById(Long.parseLong(userId))
                .orElseThrow(() -> new InvalidTokenException("사용자를 찾을 수 없습니다."));

        // 6. 새로운 Access Token 및 Refresh Token 생성
        String newAccessToken = jwtProvider.createAccessToken(userId, user.getRole().name());
        String newRefreshToken = jwtProvider.createRefreshToken(userId);

        // 7. 새로운 Refresh Token을 암호화하여 Redis에 저장
        String hashedNewRefreshToken = passwordEncoder.encode(newRefreshToken);
        redisTemplate.opsForValue().set(
                redisKey,
                hashedNewRefreshToken,
                refreshTokenTtl,
                TimeUnit.MILLISECONDS);

        // 8. 새로운 토큰 세트 반환
        Map<String, String> tokens = new HashMap<>();
        tokens.put("accessToken", newAccessToken);
        tokens.put("refreshToken", newRefreshToken);

        return tokens;
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

    // ==================== 비밀번호 재설정 ====================

    /**
     * 비밀번호 재설정 인증번호 요청
     * - 보안: 계정 존재 여부 노출 방지 (존재하지 않아도 성공 응답)
     */
    public void requestPasswordResetOtp(String email) {
        mailService.sendPasswordResetCode(email);
    }

    /**
     * 비밀번호 재설정 인증번호 검증 및 resetToken 발급
     * - 인증번호 검증 성공 시 짧은 TTL의 resetToken 발급 (5분)
     * - resetToken은 Redis에 저장: reset:token:{token} = userId
     */
    public String verifyPasswordResetOtp(String email, String code) {
        // 1. 인증번호 검증 (MailService 재사용)
        mailService.verifyCode(email, code);

        // 2. 이메일로 사용자 조회
        UserVO user = userMapper.findByEmail(email);
        if (user == null) {
            throw new LoginFailedException(); // 계정이 존재하지 않음
        }

        // 3. resetToken 생성 (UUID)
        String resetToken = java.util.UUID.randomUUID().toString();

        // 4. Redis에 resetToken 저장 (TTL 5분)
        String resetTokenKey = "reset:token:" + resetToken;
        redisTemplate.opsForValue().set(resetTokenKey, String.valueOf(user.getUserId()), 5, TimeUnit.MINUTES);

        return resetToken;
    }

    /**
     * 비밀번호 재설정 최종 확인
     * - resetToken 검증
     * - 비밀번호 일치 확인 (newPassword == confirmPassword)
     * - 비밀번호 형식 검증 (기존 isValidPassword() 재사용)
     * - 비밀번호 변경
     * - 전체 로그아웃 처리 (모든 refreshToken 삭제)
     * - resetToken 즉시 폐기
     */
    @Transactional
    public void confirmPasswordReset(String resetToken, String newPassword, String confirmPassword) {
        // 1. resetToken 검증
        String resetTokenKey = "reset:token:" + resetToken;
        String userId = redisTemplate.opsForValue().get(resetTokenKey);
        if (userId == null) {
            throw new InvalidTokenException();
        }

        // 2. 비밀번호 일치 확인
        if (!newPassword.equals(confirmPassword)) {
            throw new InvalidPasswordFormatException("비밀번호가 일치하지 않습니다");
        }

        // 3. 비밀번호 형식 검증
        if (!isValidPassword(newPassword)) {
            throw new InvalidPasswordFormatException("비밀번호 형식이 올바르지 않습니다");
        }

        // 4. 비밀번호 암호화
        String encodedPassword = passwordEncoder.encode(newPassword);

        // 5. DB 업데이트
        Map<String, Object> params = new HashMap<>();
        params.put("userId", userId);
        params.put("passwordHash", encodedPassword);
        userMapper.updatePassword(params);

        // 6. 전체 로그아웃 처리 (모든 refreshToken 삭제)
        String refreshTokenKey = "refresh:" + userId;
        redisTemplate.delete(refreshTokenKey);

        // 7. resetToken 즉시 폐기
        redisTemplate.delete(resetTokenKey);
    }

    // ==================== 내 정보 수정 ====================

    /**
     * 이메일 변경 인증번호 요청
     * - 새 이메일로 인증번호 발송
     */
    public void requestEmailChangeOtp(String newEmail) {
        mailService.sendEmailChangeCode(newEmail);
    }

    /**
     * 이메일 변경 인증번호 검증 및 토큰 발급
     * - 인증번호 검증 성공 시 짧은 TTL의 emailChangeToken 발급 (10분)
     * - emailChangeToken은 Redis에 저장: email:change:token:{userId} = {newEmail}
     */
    public void verifyEmailChangeOtp(Long userId, String newEmail, String code) {
        // 1. 인증번호 검증 (MailService 재사용)
        mailService.verifyEmailChangeCode(newEmail, code);

        // 2. Redis에 emailChangeToken 저장 (TTL 10분)
        String emailChangeTokenKey = "email:change:token:" + userId;
        redisTemplate.opsForValue().set(emailChangeTokenKey, newEmail, 10, TimeUnit.MINUTES);

        log.info("[이메일 변경] 토큰 발급 완료: userId={}, newEmail={}", userId, newEmail);
    }

    /**
     * 마이페이지 조회
     * - 현재 로그인된 사용자의 프로필 정보 조회
     * 
     * @param userId 현재 로그인된 사용자 ID (SecurityContext에서 추출)
     * @return UserVO 사용자 정보
     */
    @Transactional(readOnly = true)
    public UserVO getMyProfile(Long userId) {
        return userMapper.findById(userId)
                .orElseThrow(() -> new lookie.backend.domain.user.exception.UserNotFoundException());
    }

    /**
     * 프로필 업데이트
     * - 이름, 이메일, 비밀번호, 생년월일 선택적 수정
     * - 이메일 변경 시 emailChangeToken 검증 필수
     * - 비밀번호 변경 시 형식 검증 및 암호화
     * - 전화번호는 수정 불가 (파라미터에서 제외)
     * 
     * @param userId    현재 로그인된 사용자 ID (SecurityContext에서 추출)
     * @param name      변경할 이름 (null이면 수정 안 함)
     * @param email     변경할 이메일 (null이면 수정 안 함)
     * @param password  변경할 비밀번호 (null이면 수정 안 함)
     * @param birthDate 변경할 생년월일 (null이면 수정 안 함)
     */
    @Transactional
    public void updateProfile(Long userId, String name, String email, String password, java.time.LocalDate birthDate) {
        Map<String, Object> params = new HashMap<>();
        params.put("userId", userId);

        // 1. 이름 수정
        if (name != null && !name.trim().isEmpty()) {
            params.put("name", name);
        }

        // 2. 이메일 수정
        if (email != null && !email.trim().isEmpty()) {
            // 2-1. 이메일 형식 검증
            if (!isValidEmail(email)) {
                throw new InvalidEmailFormatException(email);
            }

            // 2-2. emailChangeToken 검증 (Redis에서 조회)
            String emailChangeTokenKey = "email:change:token:" + userId;
            String verifiedEmail = redisTemplate.opsForValue().get(emailChangeTokenKey);

            if (verifiedEmail == null || !verifiedEmail.equals(email)) {
                throw new lookie.backend.domain.user.exception.EmailChangeTokenRequiredException(email);
            }

            // 2-3. 이메일 중복 체크 개선
            // 현재 사용자의 기존 이메일 조회
            UserVO currentUser = userMapper.findById(userId)
                    .orElseThrow(() -> new lookie.backend.domain.user.exception.UserNotFoundException());

            // 기존 이메일과 다른 경우에만 중복 체크 수행
            if (!email.equals(currentUser.getEmail()) && userMapper.existByEmail(email)) {
                throw new AlreadyExistsEmailException(email);
            }

            params.put("email", email);

            // 2-4. emailChangeToken 삭제 (재사용 방지)
            redisTemplate.delete(emailChangeTokenKey);
        }

        // 3. 비밀번호 수정
        if (password != null && !password.trim().isEmpty()) {
            // 3-1. 비밀번호 형식 검증 (기존 isValidPassword() 재사용)
            if (!isValidPassword(password)) {
                throw new InvalidPasswordFormatException("비밀번호는 7~15자의 영문, 숫자 조합이어야 합니다");
            }

            // 3-2. 비밀번호 암호화
            String encodedPassword = passwordEncoder.encode(password);
            params.put("passwordHash", encodedPassword);
        }

        // 4. 생년월일 수정
        if (birthDate != null) {
            params.put("birthDate", birthDate);
        }

        // 5. DB 업데이트 (전화번호는 절대 업데이트하지 않음)
        // params에 userId만 있으면 업데이트할 내용이 없으므로 아무것도 하지 않음
        if (params.size() > 1) {
            userMapper.updateUserProfile(params);
            // 수정된 필드 목록 로깅
            String updatedFields = params.keySet().stream()
                    .filter(k -> !k.equals("userId"))
                    .map(k -> k.equals("passwordHash") ? "password" : k)
                    .collect(java.util.stream.Collectors.joining(", "));
            log.info("[프로필 수정] 완료: userId={}, 수정된 필드: {}", userId, updatedFields);
        } else {
            log.info("[프로필 수정] 요청: userId={}, 수정할 내용 없음", userId);
        }
    }

    /**
     * 회원 탈퇴 (Soft Delete)
     * - 비밀번호 검증
     * - is_active를 FALSE로 업데이트
     * - phone_number에 탈퇴 일시 추가 (재가입 방지)
     * - 모든 RefreshToken 삭제
     * 
     * @param userId   현재 로그인된 사용자 ID
     * @param password 비밀번호 (본인 확인용)
     */
    @Transactional
    public void deleteAccount(Long userId, String password) {
        // 1. 사용자 조회
        UserVO user = userMapper.findById(userId)
                .orElseThrow(() -> new lookie.backend.domain.user.exception.UserNotFoundException());

        // 2. 비밀번호 검증
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new InvalidPasswordException();
        }

        // 3. 탈퇴 일시 생성 (yyyyMMddHHmmss 형식)
        String deletedTimestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String modifiedPhoneNumber = user.getPhoneNumber() + "_DEL_" + deletedTimestamp;

        // 4. DB 업데이트 (is_active=FALSE, phone_number 수정)
        Map<String, Object> params = new HashMap<>();
        params.put("userId", userId);
        params.put("phoneNumber", modifiedPhoneNumber);
        userMapper.softDeleteUser(params);

        // 5. 모든 RefreshToken 삭제
        String refreshTokenPattern = "refresh:" + userId;
        Set<String> keys = redisTemplate.keys(refreshTokenPattern + "*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }

        log.info("[회원 탈퇴] 완료: userId={}, 수정된 전화번호={}", userId, modifiedPhoneNumber);
    }
}
