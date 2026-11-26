package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Body of POST /auth/verification-email: the login credentials (username or email) of a user whose email is
 * not verified yet, and optionally a new address (required for older accounts that have none).
 */
public record VerificationEmailRequest(
        @NotNull(message = "Username and password are required.") String username,
        @NotNull(message = "Username and password are required.") String password,
        @Size(max = 254, message = RegisterRequest.EMAIL_MESSAGE)
        @Pattern(regexp = RegisterRequest.EMAIL_PATTERN, message = RegisterRequest.EMAIL_MESSAGE)
        String email) {
}
