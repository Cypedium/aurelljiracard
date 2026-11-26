package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Body of POST /auth/reset-password: the token from the emailed link and the new password. */
public record ResetPasswordRequest(
        @NotBlank(message = "This password reset link is invalid or has expired.") String token,

        // Same rules as RegisterRequest; byte length and repeated characters are checked in the service
        @NotNull(message = "Password must be 8-72 characters.")
        @Size(min = 8, max = 72, message = "Password must be 8-72 characters.")
        String password) {
}
