package lookie.backend.domain.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.user.dto.*;
import lookie.backend.domain.user.service.UserService;
import lookie.backend.domain.user.vo.UserVO;
import lookie.backend.global.response.ApiResponse;
import lookie.backend.global.security.JwtProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "User", description = "사용자 프로필 관리 API (내 정보 조회/수정/탈퇴)")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserService userService;
    private final JwtProvider jwtProvider;

    /**
     * 마이페이지 조회
     * GET /api/users/me
     */
    @Operation(summary = "내 정보 조회", description = "현재 로그인된 사용자의 프로필 정보를 조회합니다 (이름, 전화번호, 생년월일, 이메일)")
    @GetMapping("/me")
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
     * 프로필 수정
     * PATCH /api/users/me
     */
    @Operation(summary = "내 정보 수정", description = "이름, 이메일, 비밀번호, 생년월일을 선택적으로 수정합니다 (이메일 변경 시 사전 인증 필수, 전화번호는 수정 불가)")
    @PatchMapping("/me")
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
     * 비밀번호 변경 (프로필 수정의 일부)
     * PATCH /api/users/me/password
     * 
     * 참고: API 명세서에 별도 엔드포인트가 있다면 사용, 없으면 PATCH /me로 통합
     */
    @Operation(summary = "비밀번호 변경", description = "현재 로그인된 사용자의 비밀번호를 변경합니다")
    @PatchMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody UpdateProfileRequest request) {
        // 1. Authorization 헤더에서 "Bearer " 접두사 제거하고 토큰 추출
        String accessToken = authHeader.substring(7);

        // 2. 토큰에서 사용자 ID 추출
        String userId = jwtProvider.getUserId(accessToken);

        // 3. 비밀번호만 업데이트 (다른 필드는 null)
        userService.updateProfile(
                Long.parseLong(userId),
                null, // name
                null, // email
                request.getPassword(),
                null); // birthDate

        return ResponseEntity.ok(ApiResponse.success("비밀번호가 변경되었습니다.", null));
    }

    /**
     * 회원 탈퇴 (Soft Delete)
     * DELETE /api/users/me
     */
    @Operation(summary = "회원 탈퇴", description = "현재 로그인한 사용자의 계정을 탈퇴합니다 (Soft Delete)")
    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> payload) {
        // 1. Authorization 헤더에서 "Bearer " 접두사 제거하고 토큰 추출
        String accessToken = authHeader.substring(7);

        // 2. 토큰에서 사용자 ID 추출
        String userId = jwtProvider.getUserId(accessToken);

        // 3. Request Body에서 password 추출 및 검증
        String password = payload != null ? payload.get("password") : null;
        if (password == null || password.trim().isEmpty()) {
            throw new lookie.backend.domain.user.exception.InvalidPasswordException();
        }

        // 4. 서비스 호출 (비밀번호 검증 포함)
        userService.deleteAccount(Long.parseLong(userId), password);

        return ResponseEntity.ok(ApiResponse.success("회원 탈퇴가 완료되었습니다.", null));
    }

    // ==================== 이메일 변경 OTP (명세서 확인 필요) ====================
    // 명세서에 없으면 제거하거나 내부 로직으로 통합

    /**
     * 이메일 변경 인증번호 요청
     * POST /api/users/me/email/otp/request
     * 
     * 참고: API 명세서에 없으면 제거
     */
    @Operation(summary = "이메일 변경 인증번호 요청", description = "새 이메일로 인증번호를 발송합니다 (5분 유효)")
    @PostMapping("/me/email/otp/request")
    public ResponseEntity<ApiResponse<Void>> requestEmailChangeOtp(@RequestBody EmailChangeOtpRequest request) {
        userService.requestEmailChangeOtp(request.getNewEmail());
        return ResponseEntity.ok(ApiResponse.success("인증번호가 발송되었습니다.", null));
    }

    /**
     * 이메일 변경 인증번호 검증
     * POST /api/users/me/email/otp/verify
     * 
     * 참고: API 명세서에 없으면 제거
     */
    @Operation(summary = "이메일 변경 인증번호 검증", description = "인증번호를 검증하고 이메일 변경 토큰을 발급합니다 (10분 유효)")
    @PostMapping("/me/email/otp/verify")
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
}
