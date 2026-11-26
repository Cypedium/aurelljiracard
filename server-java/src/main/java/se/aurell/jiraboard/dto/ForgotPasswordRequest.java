package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Body of POST /auth/forgot-password: the account's (verified) email address. */
public record ForgotPasswordRequest(
        @NotBlank(message = RegisterRequest.EMAIL_MESSAGE)
        @Size(max = 254, message = RegisterRequest.EMAIL_MESSAGE)
        @Pattern(regexp = RegisterRequest.EMAIL_PATTERN, message = RegisterRequest.EMAIL_MESSAGE)
        String email,

        // Optional: the UI language, for the email when the account has none saved
        String language) {
}
