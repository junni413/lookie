package lookie.backend.global.security;

import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.crypto.SecretKey;

@SpringBootTest
class JwtTokenTest {

    @Autowired
    private JwtProvider jwtProvider;

    @Test
    void 토큰_강제_발급기() {
        // 가상의 유저 정보로 토큰 생성 (DB에 없어도 토큰 자체는 유효함)
        String userId = "testUser123";
        String role = "ROLE_USER";

        // Access Token 생성 메서드 호출
        String token = jwtProvider.createAccessToken(userId, role);

        System.out.println("=========================================");
        System.out.println("👇 아래 토큰을 복사해서 HTML 테스트에 쓰세요 👇");
        System.out.println(token);
        System.out.println("=========================================");
    }
}