package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Username is required (max 32 characters).")
        @Size(max = 32, message = "Username is required (max 32 characters).")
        String username,

        // Must be verified (link by email) before the user can log in
        @NotBlank(message = RegisterRequest.EMAIL_MESSAGE)
        @Size(max = 254, message = RegisterRequest.EMAIL_MESSAGE)
        @Pattern(regexp = RegisterRequest.EMAIL_PATTERN, message = RegisterRequest.EMAIL_MESSAGE)
        String email,

        // bcrypt ignores bytes beyond 72; the byte length is also checked in AuthService
        @NotNull(message = "Password must be 8-72 characters.")
        @Size(min = 8, max = 72, message = "Password must be 8-72 characters.")
        String password,

        // Optional: the UI language while registering, for the verification email (checked in AuthService)
        String language) {

    // Something@something.tld without spaces; the same pattern as frontend/app/utils/register.ts
    public static final String EMAIL_PATTERN = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";
    public static final String EMAIL_MESSAGE = "Enter a valid email address (max 254 characters).";
}
