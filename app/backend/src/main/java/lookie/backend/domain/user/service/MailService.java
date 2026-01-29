package lookie.backend.domain.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lookie.backend.domain.user.exception.AlreadyExistsEmailException;
import lookie.backend.domain.user.exception.EmailAlreadySentException;
import lookie.backend.domain.user.exception.EmailCodeExpiredException;
import lookie.backend.domain.user.mapper.UserMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;
    private final StringRedisTemplate redisTemplate;
    private final UserMapper userMapper;

    // Redis 키 상수
    private static final String EMAIL_CODE_PREFIX = "auth:email:code:";
    private static final String EMAIL_VERIFIED_PREFIX = "auth:email:verified:";
    private static final String EMAIL_LIMIT_PREFIX = "auth:email:limit:";

    // TTL 상수 (초 단위)
    private static final long CODE_TTL = 300L; // 5분
    private static final long VERIFIED_TTL = 600L; // 10분
    private static final long LIMIT_TTL = 60L; // 1분

    /**
     * 이메일 인증번호 발송
     * - DB 중복 체크
     * - 재발송 제한 (1분)
     * - 6자리 난수 생성 및 발송
     * - Redis 저장 (TTL 5분)
     */
    public void sendVerificationCode(String email) {
        // 1. DB에서 이메일 중복 체크 (발송 전 체크)
        if (userMapper.existByEmail(email)) {
            throw new AlreadyExistsEmailException(email);
        }

        // 2. 재발송 제한 체크 (1분 내 중복 발송 방지)
        String limitKey = EMAIL_LIMIT_PREFIX + email;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(limitKey))) {
            throw new EmailAlreadySentException(email);
        }

        // 3. 6자리 인증번호 생성
        String code = generateVerificationCode();

        // 4. 이메일 발송
        sendEmail(email, code);

        // 5. Redis에 인증번호 저장 (TTL 5분)
        String codeKey = EMAIL_CODE_PREFIX + email;
        redisTemplate.opsForValue().set(codeKey, code, CODE_TTL, TimeUnit.SECONDS);

        // 6. 재발송 제한 플래그 설정 (TTL 1분)
        redisTemplate.opsForValue().set(limitKey, "sent", LIMIT_TTL, TimeUnit.SECONDS);

        log.info("[이메일 인증] 인증번호 발송 완료: {}", email);
    }

    /**
     * 이메일 인증번호 검증
     * - Redis에서 번호 대조
     * - 검증 성공 시 verified 플래그 저장 (TTL 10분)
     * - 인증번호 삭제 (재사용 방지)
     */
    public void verifyCode(String email, String inputCode) {
        // 1. Redis에서 저장된 인증번호 조회
        String codeKey = EMAIL_CODE_PREFIX + email;
        String savedCode = redisTemplate.opsForValue().get(codeKey);

        // 2. 인증번호 검증 (없거나 불일치 시 예외)
        if (savedCode == null || !savedCode.equals(inputCode)) {
            throw new EmailCodeExpiredException(email);
        }

        // 3. 검증 성공 - verified 플래그 저장 (TTL 10분)
        String verifiedKey = EMAIL_VERIFIED_PREFIX + email;
        redisTemplate.opsForValue().set(verifiedKey, "true", VERIFIED_TTL, TimeUnit.SECONDS);

        // 4. 인증번호 삭제 (재사용 방지)
        redisTemplate.delete(codeKey);

        log.info("[이메일 인증] 인증 성공: {}", email);
    }

    /**
     * 이메일 인증 완료 여부 확인
     * 회원가입 시 호출
     */
    public boolean isEmailVerified(String email) {
        String verifiedKey = EMAIL_VERIFIED_PREFIX + email;
        return Boolean.TRUE.equals(redisTemplate.hasKey(verifiedKey));
    }

    /**
     * 회원가입 완료 후 Redis 데이터 정리
     */
    public void clearEmailVerification(String email) {
        redisTemplate.delete(EMAIL_CODE_PREFIX + email);
        redisTemplate.delete(EMAIL_VERIFIED_PREFIX + email);
        redisTemplate.delete(EMAIL_LIMIT_PREFIX + email);
        log.info("[이메일 인증] Redis 데이터 정리 완료: {}", email);
    }

    /**
     * 6자리 인증번호 생성
     */
    private String generateVerificationCode() {
        Random random = new Random();
        int code = random.nextInt(1000000); // 0 ~ 999999
        return String.format("%06d", code);
    }

    /**
     * 이메일 발송
     */
    private void sendEmail(String to, String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("[Lookie] 이메일 인증번호");
            message.setText(
                    "안녕하세요, Lookie입니다.\n\n" +
                            "회원가입을 위한 인증번호는 다음과 같습니다:\n\n" +
                            "[" + code + "]\n\n" +
                            "이 인증번호는 5분간 유효합니다.\n" +
                            "본인이 요청하지 않았다면 이 메일을 무시하세요.");

            mailSender.send(message);
            log.info("[이메일 발송] 성공: {}", to);
        } catch (Exception e) {
            log.error("[이메일 발송] 실패: {}", to, e);
            throw new RuntimeException("이메일 발송에 실패했습니다", e);
        }
    }
}
