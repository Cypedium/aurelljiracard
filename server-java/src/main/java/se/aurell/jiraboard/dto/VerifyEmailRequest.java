package se.aurell.jiraboard.dto;

import jakarta.validation.constraints.NotBlank;

/** Body of POST /auth/verify-email: the token from the emailed link. */
public record VerifyEmailRequest(@NotBlank(message = "This verification link is invalid or has expired.") String token) {
}
