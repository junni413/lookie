package lookie.backend.domain.user.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PasswordResetTokenResponse {
    private String resetToken;
}
