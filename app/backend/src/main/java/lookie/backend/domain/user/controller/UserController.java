package lookie.backend.domain.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.user.dto.*;
import lookie.backend.domain.user.service.MailService;
import lookie.backend.domain.user.service.UserService;
import lookie.backend.domain.user.vo.UserVO;
import lookie.backend.global.response.ApiResponse;
import lookie.backend.global.security.JwtProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Auth", description = "회원가입, 로그인, 이메일 인증 API")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final MailService mailService;
    private final JwtProvider jwtProvider;

    /**
     * 토큰 재발급 (RTR 방식)
     * POST /api/auth/refresh
     */
    @Operation(summary = "토큰 재발급", description = "Refresh Token을 사용하여 새로운 Access Token과 Refresh Token을 발급합니다 (RTR 방식)")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(@RequestHeader("Refresh-Token") String refreshToken) {
        // 1. 토큰 재발급 처리 (RTR: 기존 토큰 삭제 + 새 토큰 생성)
        Map<String, String> tokens = userService.reissueToken(refreshToken);

        // 2. TokenResponse 생성
        TokenResponse response = TokenResponse.builder()
                .accessToken(tokens.get("accessToken"))
                .refreshToken(tokens.get("refreshToken"))
                .build();

        return ResponseEntity.ok(ApiResponse.success("토큰이 재발급되었습니다.", response));
    }

    /**
     * 회원가입
     * POST /api/auth/signup
     */
    @Operation(summary = "회원가입", description = "새로운 사용자를 등록합니다")
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<Void>> signup(@RequestBody SignupRequest request) {
        // SignupRequest -> UserVO 변환 (정적 팩토리 메서드 사용)
        UserVO userVO = UserVO.from(request);

        // 평문 비밀번호는 별도로 전달 (Service에서 암호화)
        userService.signup(userVO, request.getPassword());

        return ResponseEntity.ok(ApiResponse.success("회원가입에 성공하였습니다.", null));
    }

    /**
     * 로그인
     * POST /api/auth/login
     */
    @Operation(summary = "로그인", description = "전화번호와 비밀번호로 로그인합니다")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@RequestBody LoginRequest request) {

        Map<String, Object> loginResult = userService.login(request.getPhoneNumber(), request.getPassword());

        // Map에서 데이터 추출
        UserVO user = (UserVO) loginResult.get("user");
        String accessToken = (String) loginResult.get("accessToken");
        String refreshToken = (String) loginResult.get("refreshToken");

        // UserVO + 토큰 -> LoginResponse 변환 (passwordHash 제외)
        LoginResponse response = LoginResponse.from(user, accessToken, refreshToken);

        return ResponseEntity.ok(ApiResponse.success("로그인에 성공하였습니다.", response));
    }

    /**
     * 로그아웃
     * POST /api/auth/logout
     */
    @Operation(summary = "로그아웃", description = "현재 사용자를 로그아웃하고 토큰을 무효화합니다")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestHeader("Authorization") String authHeader) {
        // 1. Authorization 헤더에서 "Bearer " 접두사 제거하고 토큰 추출
        String accessToken = authHeader.substring(7);

        // 2. 토큰에서 사용자 ID 추출
        String userId = jwtProvider.getUserId(accessToken);

        // 3. 로그아웃 처리 (Refresh Token 삭제 + Access Token 블랙리스트 등록)
        userService.logout(accessToken, userId);

        return ResponseEntity.ok(ApiResponse.success("로그아웃되었습니다.", null));
    }

    /**
     * 이메일 인증번호 발송
     * POST /api/auth/email/send-code
     */
    @Operation(summary = "이메일 인증번호 발송", description = "회원가입을 위한 이메일 인증번호를 발송합니다 (5분 유효)")
    @PostMapping("/email/send-code")
    public ResponseEntity<ApiResponse<Void>> sendVerificationCode(@RequestBody EmailSendRequest request) {
        mailService.sendVerificationCode(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("인증번호가 발송되었습니다.", null));
    }

    /**
     * 이메일 인증번호 검증
     * POST /api/auth/email/verify
     */
    @Operation(summary = "이메일 인증번호 검증", description = "발송된 인증번호를 검증합니다")
    @PostMapping("/email/verify")
    public ResponseEntity<ApiResponse<Void>> verifyCode(@RequestBody EmailVerifyRequest request) {
        mailService.verifyCode(request.getEmail(), request.getCode());
        return ResponseEntity.ok(ApiResponse.success("이메일 인증에 성공하였습니다.", null));
    }

    // ==================== 비밀번호 재설정 ====================

    /**
     * 비밀번호 재설정 인증번호 요청
     * POST /api/auth/password/reset/otp/request
     */
    @Operation(summary = "비밀번호 재설정 인증번호 요청", description = "비밀번호 재설정을 위한 이메일 인증번호를 발송합니다 (5분 유효)")
    @PostMapping("/password/reset/otp/request")
    public ResponseEntity<ApiResponse<Void>> requestPasswordResetOtp(@RequestBody PasswordResetOtpRequest request) {
        userService.requestPasswordResetOtp(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("인증번호가 발송되었습니다.", null));
    }

    /**
     * 비밀번호 재설정 인증번호 검증
     * POST /api/auth/password/reset/otp/verify
     */
    @Operation(summary = "비밀번호 재설정 인증번호 검증", description = "인증번호를 검증하고 resetToken을 발급합니다 (5분 유효)")
    @PostMapping("/password/reset/otp/verify")
    public ResponseEntity<ApiResponse<PasswordResetTokenResponse>> verifyPasswordResetOtp(
            @RequestBody PasswordResetOtpVerifyRequest request) {
        String resetToken = userService.verifyPasswordResetOtp(request.getEmail(), request.getCode());
        PasswordResetTokenResponse response = PasswordResetTokenResponse.builder()
                .resetToken(resetToken)
                .build();
        return ResponseEntity.ok(ApiResponse.success("인증에 성공하였습니다.", response));
    }

    /**
     * 비밀번호 재설정 최종 확인
     * POST /api/auth/password/reset/confirm
     */
    @Operation(summary = "비밀번호 재설정 최종 확인", description = "resetToken을 사용하여 비밀번호를 변경합니다")
    @PostMapping("/password/reset/confirm")
    public ResponseEntity<ApiResponse<Void>> confirmPasswordReset(@RequestBody PasswordResetConfirmRequest request) {
        userService.confirmPasswordReset(request.getResetToken(), request.getNewPassword(),
                request.getConfirmPassword());
        return ResponseEntity.ok(ApiResponse.success("비밀번호가 변경되었습니다.", null));
    }

    // ==================== 내 정보 수정 ====================

    /**
     * 마이페이지 조회
     * GET /api/users/me
     */
    @Operation(summary = "마이페이지 조회", description = "현재 로그인된 사용자의 프로필 정보를 조회합니다 (이름, 전화번호, 생년월일, 이메일)")
    @GetMapping("/users/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile(
            @RequestHeader("Authorization") String authHeader) {
        // 1. Authorization 헤더에서 "Bearer " 접두사 제거하고 토큰 추출
        String accessToken = authHeader.substring(7);

        // 2. 토큰에서 사용자 ID 추출
        String userId = jwtProvider.getUserId(accessToken);

        // 3. 사용자 정보 조회
        UserVO user = userService.getMyProfile(Long.parseLong(userId));

        // 4. UserProfileResponse로 변환
        UserProfileResponse response = UserProfileResponse.from(user);

        return ResponseEntity.ok(ApiResponse.success("프로필 조회에 성공하였습니다.", response));
    }

    /**
     * 이메일 변경 인증번호 요청
     * POST /api/users/me/email/otp/request
     */
    @Operation(summary = "이메일 변경 인증번호 요청", description = "새 이메일로 인증번호를 발송합니다 (5분 유효)")
    @PostMapping("/users/me/email/otp/request")
    public ResponseEntity<ApiResponse<Void>> requestEmailChangeOtp(@RequestBody EmailChangeOtpRequest request) {
        userService.requestEmailChangeOtp(request.getNewEmail());
        return ResponseEntity.ok(ApiResponse.success("인증번호가 발송되었습니다.", null));
    }

    /**
     * 이메일 변경 인증번호 검증
     * POST /api/users/me/email/otp/verify
     */
    @Operation(summary = "이메일 변경 인증번호 검증", description = "인증번호를 검증하고 이메일 변경 토큰을 발급합니다 (10분 유효)")
    @PostMapping("/users/me/email/otp/verify")
    public ResponseEntity<ApiResponse<Void>> verifyEmailChangeOtp(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody EmailChangeOtpVerifyRequest request) {
        // 1. Authorization 헤더에서 "Bearer " 접두사 제거하고 토큰 추출
        String accessToken = authHeader.substring(7);

        // 2. 토큰에서 사용자 ID 추출
        String userId = jwtProvider.getUserId(accessToken);

        // 3. 이메일 변경 OTP 검증 및 토큰 발급
        userService.verifyEmailChangeOtp(Long.parseLong(userId), request.getNewEmail(), request.getCode());

        return ResponseEntity.ok(ApiResponse.success("이메일 변경 인증에 성공하였습니다.", null));
    }

    /**
     * 프로필 수정
     * PATCH /api/users/me
     */
    @Operation(summary = "프로필 수정", description = "이름, 이메일, 비밀번호, 생년월일을 선택적으로 수정합니다 (이메일 변경 시 사전 인증 필수, 전화번호는 수정 불가)")
    @PatchMapping("/users/me")
    public ResponseEntity<ApiResponse<Void>> updateProfile(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody UpdateProfileRequest request) {
        // 1. Authorization 헤더에서 "Bearer " 접두사 제거하고 토큰 추출
        String accessToken = authHeader.substring(7);

        // 2. 토큰에서 사용자 ID 추출
        String userId = jwtProvider.getUserId(accessToken);

        // 3. 프로필 업데이트
        userService.updateProfile(
                Long.parseLong(userId),
                request.getName(),
                request.getEmail(),
                request.getPassword(),
                request.getBirthDate());

        return ResponseEntity.ok(ApiResponse.success("프로필이 수정되었습니다.", null));
    }

    /**
     * 회원 탈퇴 (Soft Delete)
     * DELETE /api/users/me
     */
    @Operation(summary = "회원 탈퇴", description = "현재 로그인한 사용자의 계정을 탈퇴합니다 (Soft Delete)")
    @DeleteMapping("/users/me")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody DeleteAccountRequest request) {

        // 1. Authorization 헤더에서 "Bearer " 접두사 제거하고 토큰 추출
        String accessToken = authHeader.substring(7);

        // 2. 토큰에서 사용자 ID 추출
        String userId = jwtProvider.getUserId(accessToken);

        // 3. 서비스 호출 (비밀번호 검증 포함)
        userService.deleteAccount(Long.parseLong(userId), request.getPassword());

        return ResponseEntity.ok(ApiResponse.success("회원 탈퇴가 완료되었습니다.", null));
    }
}
