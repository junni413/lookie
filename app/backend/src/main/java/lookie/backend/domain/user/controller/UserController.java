package lookie.backend.domain.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.user.dto.EmailSendRequest;
import lookie.backend.domain.user.dto.EmailVerifyRequest;
import lookie.backend.domain.user.dto.LoginRequest;
import lookie.backend.domain.user.dto.LoginResponse;
import lookie.backend.domain.user.dto.SignupRequest;
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
}
