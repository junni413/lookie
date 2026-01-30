package lookie.backend.domain.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 토큰 재발급 응답 DTO
 * - 새로 발급된 Access Token과 Refresh Token을 반환
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TokenResponse {
    private String accessToken;
    private String refreshToken;
}
