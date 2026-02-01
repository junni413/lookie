package lookie.backend.global.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

public class SecurityUtil {

    /**
     * 현재 로그인한 사용자의 ID를 반환합니다.
     * JwtFilter(String)와 @WithMockUser(UserDetails) 양쪽의 principal 타입을 모두 지원합니다.
     */
    public static Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getPrincipal() == null) {
            throw new IllegalStateException("Security Context에 인증 정보가 없습니다.");
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof UserDetails) {
            return Long.valueOf(((UserDetails) principal).getUsername());
        }

        if (principal instanceof String) {
            return Long.valueOf(principal.toString());
        }

        throw new IllegalStateException("지원되지 않는 Principal 타입입니다: " + principal.getClass().getName());
    }
}
