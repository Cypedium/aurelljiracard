package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Username is required (max 32 characters).")
        @Size(max = 32, message = "Username is required (max 32 characters).")
        String username,

        // bcrypt ignores bytes beyond 72; the byte length is also checked in AuthService
        @NotNull(message = "Password must be 6-72 characters.")
        @Size(min = 6, max = 72, message = "Password must be 6-72 characters.")
        String password,

        // Optional; an empty string means "no picture" (the register form sends "")
        String pictureUrl) {
}
