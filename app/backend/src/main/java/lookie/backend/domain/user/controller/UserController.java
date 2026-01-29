package lookie.backend.domain.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lookie.backend.domain.user.dto.LoginRequest;
import lookie.backend.domain.user.service.UserService;
import lookie.backend.domain.user.vo.UserVO;
import lookie.backend.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Auth", description = "회원가입, 로그인 API")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * 회원가입
     * POST /api/auth/signup
     */
    @Operation(summary = "회원가입", description = "새로운 사용자를 등록합니다")
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<Void>> signup(@RequestBody UserVO userVO) {
        userService.signup(userVO);
        return ResponseEntity.ok(ApiResponse.success("회원가입에 성공하였습니다.", null));
    }

    /**
     * 로그인
     * POST /api/auth/login
     */
    @Operation(summary = "로그인", description = "전화번호와 비밀번호로 로그인합니다")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserVO>> login(@RequestBody LoginRequest request) {
        UserVO user = userService.login(request.getPhoneNumber(), request.getPassword());
        return ResponseEntity.ok(ApiResponse.success("로그인에 성공하였습니다.", user));
    }
}
